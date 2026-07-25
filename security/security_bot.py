#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import subprocess
import json
import logging
import datetime
import os
import requests

# ============================================
# CONFIGURAZIONE
# ============================================

LOG_FILE = "/var/log/security_bot.log"
REPORT_DIR = "/var/log"
DEEPSEEK_URL = "http://localhost:11434/api/generate"
DEEPSEEK_MODEL = "deepseek-r1:1.5b"

# ============================================
# LOGGING
# ============================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)

# ============================================
# FUNZIONI DI SCANSIONE
# ============================================

def run_nmap(target="localhost"):
    """Esegue scansione nmap"""
    cmd = f"nmap -sV --script=default {target}"
    logging.info(f"🔍 Avvio nmap su {target}")
    logging.info(f"Esecuzione: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
        return result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return "Timeout: nmap non completato"

def run_nikto(target="localhost"):
    """Esegue scansione nikto"""
    # Correzione: usa HTTPS per myzubster.com
    cmd = f"nikto -h https://myzubster.com -ssl -Format json"
    logging.info(f"🔍 Avvio nikto su {target}")
    logging.info(f"Esecuzione: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
        output = result.stdout + result.stderr
        return output if output.strip() else "Nessun output"
    except subprocess.TimeoutExpired:
        return "Timeout: nikto non completato"

def run_sqlmap(target="localhost"):
    """Esegue scansione sqlmap"""
    cmd = f"sqlmap -u {target} --batch --level=1 --risk=1"
    logging.info(f"🔍 Avvio sqlmap su {target}")
    logging.info(f"Esecuzione: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
        return result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return "Timeout: sqlmap non completato"

def run_gobuster(target="localhost"):
    """Esegue scansione gobuster"""
    wordlist = "/usr/share/wordlists/dirb/common.txt"
    cmd = f"gobuster dir -u {target} -w {wordlist} -t 50 --no-error --status-codes 200,204,301,302,307,403 --exclude-length 468"
    logging.info(f"🔍 Avvio gobuster su {target} con wordlist: {wordlist}")
    logging.info(f"Esecuzione: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
        return result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return "Timeout: gobuster non completato"

# ============================================
# FUNZIONE DEEPSEEK
# ============================================

def analyze_with_deepseek(scan_results):
    """Invia i risultati a DeepSeek per l'analisi"""
    logging.info("🤖 Invio risultati a DeepSeek per l'analisi...")
    
    # Prepara il prompt per DeepSeek
    prompt = f"""
    Sei un esperto di sicurezza informatica. Analizza i seguenti risultati di scansione di vulnerabilità e identifica:
    1. Quali servizi sono esposti
    2. Quali sono le vulnerabilità critiche
    3. Quali sono le raccomandazioni per la sicurezza

    Risultati della scansione:
    {scan_results}
    """
    
    try:
        response = requests.post(
            DEEPSEEK_URL,
            json={
                "model": DEEPSEEK_MODEL,
                "prompt": prompt,
                "stream": False
            },
            timeout=60
        )
        
        if response.status_code == 200:
            data = response.json()
            analysis = data.get("response", "Nessuna risposta")
            logging.info("✅ Analisi DeepSeek completata")
            return analysis
        else:
            error_msg = f"Errore DeepSeek: {response.status_code}"
            logging.error(error_msg)
            return error_msg
    except requests.exceptions.ConnectionError:
        error_msg = "Errore DeepSeek: connessione rifiutata (Ollama non in esecuzione?)"
        logging.error(error_msg)
        return error_msg
    except Exception as e:
        error_msg = f"Errore DeepSeek: {str(e)}"
        logging.error(error_msg)
        return error_msg

# ============================================
# FUNZIONE PRINCIPALE
# ============================================

def main():
    logging.info("🚀 Avvio scansione di sicurezza completa")
    
    target = "localhost"
    results = {
        "timestamp": datetime.datetime.now().isoformat(),
        "target": target,
        "scans": {}
    }
    
    # Esegui le scansioni
    try:
        results["scans"]["nmap"] = run_nmap(target)
    except Exception as e:
        results["scans"]["nmap"] = f"Errore: {str(e)}"
    
    try:
        results["scans"]["nikto"] = run_nikto(target)
    except Exception as e:
        results["scans"]["nikto"] = f"Errore: {str(e)}"
    
    try:
        results["scans"]["sqlmap"] = run_sqlmap(target)
    except Exception as e:
        results["scans"]["sqlmap"] = f"Errore: {str(e)}"
    
    try:
        results["scans"]["gobuster"] = run_gobuster(target)
    except Exception as e:
        results["scans"]["gobuster"] = f"Errore: {str(e)}"
    
    # Analisi DeepSeek
    all_results = "\n".join([f"{k}:\n{v}" for k, v in results["scans"].items()])
    results["deepseek_analysis"] = analyze_with_deepseek(all_results)
    
    # Salva il report
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"{REPORT_DIR}/security_report_{timestamp}.json"
    with open(report_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    logging.info(f"📄 Report salvato in {report_file}")
    logging.info("✅ Scansione completata")

if __name__ == "__main__":
    main()
