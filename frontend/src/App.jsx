import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [products, setProducts] = useState([]) 
  const [feedback, setFeedback] = useState('Clique para começar')
  
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')

  const [searchMatches, setSearchMatches] = useState([]) 
  const [selectedProduct, setSelectedProduct] = useState(null) 
  const [currentQty, setCurrentQty] = useState(0) 
  const [currentUnit, setCurrentUnit] = useState('caixa') 

  const [inventoryList, setInventoryList] = useState([]) 

  useEffect(() => {
    axios.get('http://localhost:8000/products/?limit=1000')
      .then(response => {
        setProducts(response.data)
        setFeedback(`Pronto. ${response.data.length} produtos carregados.`)
      })
      .catch((error) => {
        console.error(error)
        setFeedback("Erro de conexão com o Backend.")
      })
  }, [])

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { alert("Navegador sem suporte a voz."); return }

    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.continuous = false
    
    recognition.onstart = () => {
      setIsListening(true)
      setFeedback("Ouvindo...")
      setSearchMatches([]) 
      setSelectedProduct(null)
    }

    recognition.onend = () => setIsListening(false)

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript
      setTranscript(text)
      processCommand(text)
    }

    recognition.start()
  }

  const normalizeNumbers = (text) => {
    const map = {
      'um': '1', 'uma': '1',
      'dois': '2', 'duas': '2',
      'tres': '3', 'três': '3',
      'quatro': '4',
      'cinco': '5',
      'seis': '6', 'meia': '6',
      'sete': '7',
      'oito': '8',
      'nove': '9',
      'dez': '10'
    }
    
    return text.split(' ').map(word => map[word.toLowerCase()] || word).join(' ')
  }

  const processCommand = (text) => {
    let lowerText = normalizeNumbers(text.toLowerCase())
    
    const countRegex = /(\d+)\s*(paletes|palete|camadas|camada|lastros|lastro|caixas|caixa|fardos|fardo|unidades|unidade)?/
    const match = lowerText.match(countRegex)

    let quantity = 1
    let unit = 'caixa'
    let textToSearch = lowerText

    if (match) {
      quantity = parseInt(match[1])
      
      if (match[2]) {
        const unitWord = match[2]
        if (unitWord.includes('palet')) unit = 'palete'
        if (unitWord.includes('camad') || unitWord.includes('lastro')) unit = 'camada'
      }

      textToSearch = lowerText.replace(match[0], '')
    }

    let searchTerm = textToSearch
      .replace(/\bde\b|\bdo\b|\bda\b|\bcom\b/g, '')
      .replace(/paletes|palete|camadas|camada|lastros|lastro|caixas|caixa|fardos|fardo|unidades|unidade/g, '')
      
    // AQUI ESTÁ A CORREÇÃO: Padronização e Fusão de Unidades
    // 1. Padroniza escrita de litros e mls
    searchTerm = searchTerm.replace(/\blitros\b|\blitro\b/g, 'l')
    searchTerm = searchTerm.replace(/\bmls\b/g, 'ml')
    
    // 2. Cola o número na unidade (ex: "1 l" vira "1l", "600 ml" vira "600ml")
    searchTerm = searchTerm.replace(/(\d)\s+(l|ml)/g, '$1$2')
    
    searchTerm = searchTerm.trim()

    const matches = products.filter(p => {
      const productText = (p.name + " " + (p.keywords || "")).toLowerCase()
      const searchParts = searchTerm.split(' ').filter(part => part.length > 0)
      
      return searchParts.every(part => {
        // Se a parte for "1l", "600ml", "350ml", busca como texto normal
        if (/\d+(l|ml)/.test(part)) {
          return productText.includes(part)
        }
        // Se for um número sozinho (ex: "1"), exige que seja uma palavra exata
        // para não achar o "1" dentro de "12" ou "2021"
        if (/^\d+$/.test(part)) {
          const numberRegex = new RegExp(`\\b${part}\\b`)
          return numberRegex.test(productText)
        }
        // Para texto normal (ex: "skol"), busca normal
        return productText.includes(part)
      })
    })

    if (matches.length === 0) {
      setFeedback(`Não achei "${searchTerm}". Tente ser mais específico.`)
      setSearchMatches([])
    } else if (matches.length === 1) {
      setFeedback("Produto encontrado!")
      setSearchMatches([])
      setSelectedProduct(matches[0])
    } else {
      setFeedback(`Achei ${matches.length} opções para "${searchTerm}". Selecione:`)
      setSearchMatches(matches)
      setSelectedProduct(null)
    }

    setCurrentQty(quantity)
    setCurrentUnit(unit)
  }

  const calculateTotal = (product, qty, unit) => {
    if (!product) return 0
    if (unit === 'palete') return qty * product.factor_pallet
    if (unit === 'camada') return qty * product.factor_layer
    return qty * product.factor_box 
  }

  const confirmItem = () => {
    if (!selectedProduct) return

    const total = calculateTotal(selectedProduct, currentQty, currentUnit)
    
    const newItem = {
      id: Date.now(),
      erp_code: selectedProduct.erp_code,
      name: selectedProduct.name,
      qty_input: currentQty,
      unit_input: currentUnit,
      total_boxes: total
    }

    setInventoryList([...inventoryList, newItem])
    setSelectedProduct(null)
    setSearchMatches([])
    setTranscript("")
    setFeedback("Salvo! Próximo?")
  }

  const exportData = () => {
    let csvContent = "data:text/csv;charset=utf-8," 
      + "CODIGO;PRODUTO;QTD_FALADA;UNIDADE;TOTAL_CAIXAS\n"
      + inventoryList.map(item => 
          `${item.erp_code};${item.name};${item.qty_input};${item.unit_input};${item.total_boxes}`
        ).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "contagem_estoque.csv")
    document.body.appendChild(link)
    link.click()
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <h1>CargVoice Coletor 📦</h1>
      
      <div style={{ backgroundColor: '#333', padding: '20px', borderRadius: '15px', marginBottom: '20px' }}>
        <p style={{ color: '#aaa', minHeight: '1.5em' }}>{transcript || "..."}</p>
        <p style={{ fontSize: '1.2rem', color: '#4CAF50', fontWeight: 'bold' }}>{feedback}</p>
        
        <button 
          onClick={startListening}
          disabled={isListening}
          style={{
            fontSize: '1.5rem', padding: '15px 30px', borderRadius: '50px',
            backgroundColor: isListening ? '#f44336' : '#2196F3', color: 'white', border: 'none', cursor: 'pointer', marginTop: '10px'
          }}
        >
          {isListening ? 'Ouvindo...' : '🎙️ FALAR'}
        </button>
      </div>

      {searchMatches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <h3>Selecione o correto:</h3>
          {searchMatches.map(p => (
            <button 
              key={p.id} 
              onClick={() => setSelectedProduct(p)}
              style={{ padding: '15px', backgroundColor: '#444', border: '1px solid #555', color: 'white', textAlign: 'left', cursor: 'pointer' }}
            >
              <strong>{p.erp_code}</strong> - {p.name}
            </button>
          ))}
        </div>
      )}

      {selectedProduct && (
        <div style={{ backgroundColor: '#444', padding: '20px', borderRadius: '10px', border: '2px solid #2196F3', marginBottom: '20px' }}>
          <h3>{selectedProduct.name}</h3>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '15px 0' }}>
            <div>
              <label>Fator Palete:</label> <br/>
              <input 
                type="number" 
                value={selectedProduct.factor_pallet} 
                onChange={(e) => setSelectedProduct({...selectedProduct, factor_pallet: parseInt(e.target.value) || 0})}
                style={{ width: '60px', padding: '5px', textAlign: 'center' }}
              />
            </div>
            <div>
              <label>Fator Lastro:</label> <br/>
              <input 
                type="number" 
                value={selectedProduct.factor_layer} 
                onChange={(e) => setSelectedProduct({...selectedProduct, factor_layer: parseInt(e.target.value) || 0})}
                style={{ width: '60px', padding: '5px', textAlign: 'center' }}
              />
            </div>
          </div>

          <h2 style={{ color: '#0f0' }}>
            {currentQty} {currentUnit}(s) = {calculateTotal(selectedProduct, currentQty, currentUnit)} Caixas
          </h2>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button 
              onClick={confirmItem}
              style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '15px 30px', fontSize: '1.2rem', borderRadius: '8px', cursor: 'pointer' }}
            >
              ✅ SALVAR
            </button>
            <button 
              onClick={() => setSelectedProduct(null)}
              style={{ backgroundColor: '#f44336', color: 'white', border: 'none', padding: '15px 30px', fontSize: '1.2rem', borderRadius: '8px', cursor: 'pointer' }}
            >
              CANCELAR
            </button>
          </div>
        </div>
      )}

      {inventoryList.length > 0 && (
        <div>
          <h3>📦 Itens Contados ({inventoryList.length})</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#222' }}>
                  <th style={{ padding: '10px' }}>Cód</th>
                  <th>Produto</th>
                  <th>Qtd</th>
                  <th>Total</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {inventoryList.map((item, index) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '8px' }}>{item.erp_code}</td>
                    <td>{item.name.substring(0, 15)}...</td>
                    <td>{item.qty_input} {item.unit_input.substring(0,3)}</td>
                    <td style={{ color: '#0f0', fontWeight: 'bold' }}>{item.total_boxes}</td>
                    <td>
                      <button 
                        onClick={() => setInventoryList(inventoryList.filter(i => i.id !== item.id))}
                        style={{ padding: '2px 8px', backgroundColor: '#f44336', fontSize: '0.8rem' }}
                      >
                        X
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button 
            onClick={exportData}
            style={{ marginTop: '20px', backgroundColor: '#FF9800', color: 'black', padding: '15px 30px', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', width: '100%' }}
          >
            📥 BAIXAR EXCEL/CSV
          </button>
        </div>
      )}
    </div>
  )
}

export default App