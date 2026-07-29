# 🔒 MyZubster Security Policy & Bug Bounty Program

**Version:** 1.0  
**Last Updated:** 2026-07-29

---

## 📌 Scope

This security policy applies to all MyZubster projects:

| Repository | Description |
|------------|-------------|
| [MyZubsterGateway](https://github.com/DanielIoni-creator/MyZubsterGateway) | Payment gateway |
| [myzubster](https://github.com/DanielIoni-creator/myzubster) | Main application |
| [MyZubster-Marketplace](https://github.com/DanielIoni-creator/MyZubster-Marketplace) | Marketplace |

---

## 💰 Bug Bounty Program

We pay **Monero (XMR)** for security vulnerabilities!

### Reward Tiers

| Severity | Reward (XMR) | Examples |
|----------|--------------|----------|
| **Critical** | 0.50 XMR | RCE, SQL injection, Auth bypass |
| **High** | 0.25 XMR | XSS, CSRF, Privilege escalation |
| **Medium** | 0.10 XMR | DoS, Information disclosure |
| **Low** | 0.05 XMR | Security misconfigurations |

**Total Bounty Pool:** 2.00 XMR (≈ €400)

---

## 🎯 What We're Looking For

### Critical Vulnerabilities

| Type | Description | Reward |
|------|-------------|--------|
| **Remote Code Execution** | Unauthorized code execution | 0.50 XMR |
| **Authentication Bypass** | Bypass JWT or session auth | 0.50 XMR |
| **SQL Injection** | Database access | 0.50 XMR |
| **Privilege Escalation** | Unauthorized access escalation | 0.50 XMR |

### High Severity

| Type | Description | Reward |
|------|-------------|--------|
| **XSS** | Cross-site scripting | 0.25 XMR |
| **CSRF** | Cross-site request forgery | 0.25 XMR |
| **Sensitive Data Exposure** | Exposure of secrets/PII | 0.25 XMR |
| **IDOR** | Insecure direct object references | 0.25 XMR |

### Medium Severity

| Type | Description | Reward |
|------|-------------|--------|
| **Information Disclosure** | Exposure of system info | 0.10 XMR |
| **DoS** | Denial of service | 0.10 XMR |
| **Rate Limiting Bypass** | Bypass rate limits | 0.10 XMR |
| **Improper Headers** | Missing security headers | 0.10 XMR |

### Low Severity

| Type | Description | Reward |
|------|-------------|--------|
| **Security Misconfiguration** | Configuration issues | 0.05 XMR |
| **CVE in Dependencies** | Known CVEs | 0.05 XMR |
| **Missing Security Headers** | X-XSS-Protection, etc. | 0.05 XMR |
| **Logging Sensitive Data** | Excessive logging | 0.05 XMR |

---

## 🔍 How to Report

### Step 1: Prepare Report

Include:
- **Title:** Brief description
- **Type:** Vulnerability type
- **Severity:** Critical/High/Medium/Low
- **Steps to Reproduce:** Detailed steps
- **Proof of Concept:** Code or screenshots
- **Impact:** What could happen
- **Suggested Fix:** How to fix it

### Step 2: Submit Report

Open a **GitHub Issue** with the label:
🔒 security-report
text


**Template:**

```yaml
Title: [SECURITY] Brief description of vulnerability
Labels: 🔒 security-report

## Vulnerability Details
- **Type:** [CWE category]
- **Severity:** [Critical/High/Medium/Low]
- **Affected Components:** [Repo/File/Endpoint]

## Steps to Reproduce
1. ...
2. ...
3. ...

## Proof of Concept
```bash
# Commands or code

Impact

    [What could an attacker do?]

Suggested Fix

    [How to fix it]

text


---

## 📋 Disclosure Policy

| Type | Timeframe |
|------|-----------|
| **Private Disclosure** | 90 days |
| **Public Disclosure** | After fix release |

**We will not take legal action against researchers who follow this policy.**

---

## 🔗 Related Documents

- [AI_CONTRACT.md](AI_CONTRACT.md)
- [BOT_CONTRACT.md](BOT_CONTRACT.md)
- [ECONOMICS.md](ECONOMICS.md)

---

## 📞 Contact

| Channel | Link |
|---------|------|
| **GitHub** | [DanielIoni-creator](https://github.com/DanielIoni-creator) |
| **Email** | [Add email] |

---

**🛡️ Help us make MyZubster more secure!**
