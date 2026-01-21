import React, { useState, useEffect } from 'react'
import './App.css'
import logoCarg from './assets/logo-carg.png'

const API_BASE_URL = "https://cargvoice-backend.onrender.com"

function App() {
  const [isListening, setIsListening] = useState(false)
  const [status, setStatus] = useState("Toque para iniciar")
  const [transcript, setTranscript] = useState("")
  const [report, setReport] = useState({})
  const [recognition, setRecognition] = useState(null)

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const Speech = window.SpeechRecognition || window.webkitSpeechRecognition
      const rec = new Speech()
      rec.lang = 'pt-BR'
      rec.interimResults = false
      rec.maxAlternatives = 1

      rec.onstart = () => {
        setIsListening(true)
        setStatus("Ouvindo...")
        setTranscript("")
      }

      rec.onend = () => {
        setIsListening(false)
        setStatus(prev => prev === "Ouvindo..." ? "Toque para iniciar" : prev)
      }

      rec.onresult = (event) => {
        const text = event.results[0][0].transcript
        setTranscript(text)
        setStatus("Processando...")
        processCommand(text)
      }
      
      setRecognition(rec)
    } else {
      setStatus("Navegador não suportado")
    }
  }, [])

  const toggleMic = () => {
    if (!recognition) return
    if (isListening) recognition.stop()
    else recognition.start()
  }

  const processCommand = async (text) => {
    let qty = 1
    let unitType = 'unidade'
    let term = text

    const numberMatch = text.match(/^(\d+)/)
    if (numberMatch) {
      qty = parseInt(numberMatch[0])
      term = text.replace(/^(\d+)/, '').trim()
    }

    const lower = term.toLowerCase()
    if (lower.includes('palete') || lower.includes('pallet')) {
      unitType = 'palete'
      term = term.replace(/(paletes|palete|pallet|pallets)(\s+de)?/gi, '').trim()
    } else if (lower.includes('lastro') || lower.includes('camada')) {
      unitType = 'lastro'
      term = term.replace(/(lastros|lastro|camada|camadas)(\s+de)?/gi, '').trim()
    }

    setStatus(`Buscando: ${term}...`)
    
    try {
      const res = await fetch(`${API_BASE_URL}/voice_search/?query=${encodeURIComponent(term)}`)
      if (!res.ok) throw new Error("Erro na API")
      const data = await res.json()

      if (data.products && data.products.length > 0) {
        addToReport(data.products[0], qty, unitType)
      } else {
        setStatus(`Não encontrei "${term}"`)
      }
    } catch (error) {
      console.error(error)
      setStatus("Erro de conexão")
    }
  }

  const addToReport = (product, inputQty, inputType) => {
    let finalQty = inputQty
    let factor = 1
    let typeLabel = "UN"

    if (inputType === 'palete') {
      factor = product.palete || 0
      typeLabel = "PAL"
    } else if (inputType === 'lastro') {
      factor = product.lastro || 0
      typeLabel = "LAS"
    }

    if (factor === 0 && inputType !== 'unidade') {
      setStatus(`Erro: ${product.name} sem cadastro de ${inputType}`)
      return
    }

    if (inputType !== 'unidade') {
      finalQty = inputQty * factor
    }

    setReport(prev => {
      const newReport = { ...prev }
      const entry = { 
        id: Date.now(), 
        qtd: inputQty, 
        type: typeLabel, 
        calc: finalQty 
      }

      if (newReport[product.id]) {
        newReport[product.id].total += finalQty
        newReport[product.id].history.push(entry)
      } else {
        newReport[product.id] = {
          name: product.name,
          code: product.code,
          total: finalQty,
          history: [entry]
        }
      }
      return newReport
    })
    setStatus(`Adicionado: +${finalQty}`)
  }

  const clearReport = () => {
    if(window.confirm("Limpar relatório?")) {
      setReport({})
      setStatus("Relatório limpo")
      setTranscript("")
    }
  }

  const exportData = () => {
    const items = Object.values(report)
    if (items.length === 0) return alert("Nada para exportar")
    
    let csvContent = "data:text/csv;charset=utf-8,CODIGO;PRODUTO;TOTAL_UNIDADES;HISTORICO\n" +
      items.map(item => {
          const historyStr = item.history.map(h => `${h.qtd}${h.type}`).join(" + ")
          return `${item.code};${item.name};${item.total};${historyStr}`
      }).join("\n")

    const link = document.createElement("a")
    link.href = encodeURI(csvContent)
    link.download = `inventario_${new Date().toLocaleDateString()}.csv`
    document.body.appendChild(link)
    link.click()
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-area">
          <img src={logoCarg} alt="CargVoice" className="logo" />
        </div>
      </header>

      <main>
        <div className="control-card">
          <h1>Carg<span>Voice</span></h1>
          <p className="hint">Ex: "5 paletes de Skol"</p>
          
          <div className="mic-wrapper">
            <button className={`mic-button ${isListening ? 'listening' : ''}`} onClick={toggleMic}>
              <svg viewBox="0 0 24 24" width="32" height="32">
                <path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path fill="currentColor" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>
          </div>
          
          <div className="status-text" style={{ color: isListening ? '#22C55E' : '#1F2937' }}>
            {status}
          </div>
          {transcript && <div className="transcript-text">"{transcript}"</div>}
        </div>

        {Object.keys(report).length > 0 && (
          <div className="report-card">
            <div className="report-header">
              <h2>Relatório ({Object.keys(report).length})</h2>
              <div className="actions">
                <button onClick={clearReport} className="btn-secondary">Limpar</button>
                <button onClick={exportData} className="btn-primary-small">CSV</button>
              </div>
            </div>
            
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th className="mobile-hide">Histórico</th>
                    <th className="right-align">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(report).map((item) => (
                    <tr key={item.code}>
                      <td>
                        <span className="prod-name">{item.name}</span>
                        <span className="prod-code">Cód: {item.code}</span>
                        <div className="mobile-only-history">
                           {item.history.map((h, i) => (
                            <span key={i} className="tag-mini">{h.qtd}{h.type}</span>
                          ))}
                        </div>
                      </td>
                      <td className="mobile-hide">
                        <div className="history-tags">
                          {item.history.map((h, i) => (
                            <span key={i} className="tag">{h.qtd} {h.type}</span>
                          ))}
                        </div>
                      </td>
                      <td className="total-cell">{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App