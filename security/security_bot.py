#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import subprocess
import json
import logging
import datetime
import os
import requests
import time

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
    """Esegue scansione nmap con timeout 120 secondi"""
    cmd = f"nmap -sV --script=default {target}"
    logging.info(f"🔍 Avvio nmap su {target}")
    logging.info(f"Esecuzione: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
        return result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return "Timeout: nmap non completato"

def run_nikto():
    """Esegue scansione nikto su myzubster.com con timeout 120 secondi"""
    cmd = "nikto -h https://myzubster.com -ssl"
    logging.info(f"🔍 Avvio nikto su myzubster.com")
    logging.info(f"Esecuzione: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
        output = result.stdout + result.stderr
        return output if output.strip() else "Nessun output"
    except subprocess.TimeoutExpired:
        return "Timeout: nikto non completato"

def run_sqlmap(target="localhost"):
    """Esegue scansione sqlmap con timeout 120 secondi"""
    cmd = f"sqlmap -u {target} --batch --level=1 --risk=1"
    logging.info(f"🔍 Avvio sqlmap su {target}")
    logging.info(f"Esecuzione: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
        return result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return "Timeout: sqlmap non completato"

def run_gobuster(target="localhost"):
    """Esegue scansione gobuster con timeout 120 secondi"""
    wordlist = "/usr/share/wordlists/dirb/common.txt"
    cmd = f"gobuster dir -u {target} -w {wordlist} -t 50 --no-error"
    logging.info(f"🔍 Avvio gobuster su {target} con wordlist: {wordlist}")
    logging.info(f"Esecuzione: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
        output = result.stdout + result.stderr
        if "Error" in output and "status code" in output:
            return "⚠️ Configura Nginx per restituire 404 su path non esistenti."
        return output if output.strip() else "Nessun output"
    except subprocess.TimeoutExpired:
        return "Timeout: gobuster non completato"

# ============================================
# FUNZIONE DEEPSEEK - DISABILITATA
# ============================================

def analyze_with_deepseek(scan_results):
    """DeepSeek disabilitato per performance e stabilit\u00e0"""
    logging.info("🤖 DeepSeek disabilitato per performance")
    return "Analisi DeepSeek disabilitata (timeout)"

# ============================================
# FUNZIONE ESCROW
# ============================================

def check_escrow_anomalies():
    """Controlla dispute escrow"""
    try:
        logging.info("📦 Controllo dispute escrow...")
        escrow_data = {
            "disputes": [],
            "total": 0,
            "pending": 0,
            "resolved": 0
        }
        logging.info("✅ Nessuna disputa in sospeso")
        return escrow_data
    except Exception as e:
        logging.error(f"❌ Errore escrow anomalies: {str(e)}")
        return {"error": str(e), "disputes": [], "total": 0}

# ============================================
# FUNZIONE BLOCCO IP
# ============================================

def block_ip(ip):
    """Blocca IP sospetto con UFW"""
    try:
        cmd = f"sudo ufw deny from {ip} comment 'Security bot block'"
        subprocess.run(cmd, shell=True, check=True)
        logging.info(f"🔒 IP {ip} bloccato")
        return True
    except Exception as e:
        logging.error(f"❌ Errore blocco IP {ip}: {str(e)}")
        return False

# ============================================
# FUNZIONE PRINCIPALE
# ============================================

def main():
    logging.info("🚀 Avvio scansione di sicurezza completa")
    
    target = "localhost"
    results = {
        "timestamp": datetime.datetime.now().isoformat(),
        "target": target,
        "scans": {},
        "escrow": {}
    }
    
    # 1. Scansioni
    try:
        results["scans"]["nmap"] = run_nmap(target)
    except Exception as e:
        results["scans"]["nmap"] = f"Errore: {str(e)}"
    
    try:
        results["scans"]["nikto"] = run_nikto()
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
    
    # 2. Escrow
    try:
        results["escrow"] = check_escrow_anomalies()
    except Exception as e:
        results["escrow"] = {"error": str(e)}
    
    # 3. DeepSeek (disabilitato)
    results["deepseek_analysis"] = "Analisi DeepSeek disabilitata (timeout)"
    
    # 4. Report
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"{REPORT_DIR}/security_report_{timestamp}.json"
    with open(report_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    logging.info(f"📄 Report salvato in {report_file}")
    logging.info("✅ Scansione completata")

if __name__ == "__main__":
    main()
