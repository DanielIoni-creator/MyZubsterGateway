# Position Paper: [Tokenisation Initiative Name]

**Prepared for:** Monetary Authority of Singapore (MAS) / [industry working group]  
**Prepared by:** [legal entity and UEN]  
**Version:** [0.1]  
**Date:** [YYYY-MM-DD]  
**Document owner:** [name, role, email]  
**Classification:** [public / confidential]

> Completion note: replace every bracketed field, delete instructional text, and
> obtain Singapore legal advice before submission. This template is not legal
> advice and does not assume that a token is outside any regulated perimeter.

## Executive Summary

### Proposal

[In 150-250 words, state the asset, intended users, transaction flow, settlement
asset, network, operator, and requested regulatory outcome.]

**Example:**

> [Project Atlas] proposes a permissioned pilot for tokenised Singapore-dollar
> corporate bonds. Regulated financial institutions would subscribe, transfer,
> and redeem tokens representing beneficial interests in identified securities.
> Cash-leg settlement would use a simulated wholesale SGD settlement token in
> the pilot. The operator would apply participant admission, transaction
> screening, role-based access, and complete audit logging. The pilot seeks to
> test delivery-versus-payment, interoperability, and operational controls in a
> restricted environment before any production or public offering decision.

### Decision requested

- Requested engagement: [pre-application meeting / sandbox discussion / policy feedback]
- Pilot duration and limits: [dates, participants, value and transaction caps]
- Questions for MAS: [list the precise interpretive or supervisory questions]

### Expected outcomes

| Outcome | Measure | Target |
|---|---|---|
| Settlement efficiency | End-to-end settlement time | [target] |
| Risk reduction | Failed or unmatched settlements | [target] |
| Compliance | Screened participants and transactions | [target] |
| Resilience | Recovery time objective | [target] |

## Regulatory Analysis

### Facts and assumptions

| Topic | Project fact | Evidence / owner |
|---|---|---|
| Token rights | [ownership, debt, payment, access or other rights] | [term sheet] |
| Issuer / operator | [entities and jurisdictions] | [corporate records] |
| Participant types | [banks, funds, accredited investors, retail] | [onboarding policy] |
| Custody / keys | [who controls assets and private keys] | [custody design] |
| Money flows | [fiat, stablecoin, CBDC simulation, DPT] | [flow diagram] |
| Marketing | [private pilot, restricted offer, public offer] | [distribution plan] |

### Regulatory perimeter assessment

Complete with Singapore counsel. Explain the conclusion and contrary arguments;
do not provide only a yes/no answer.

| Area | Assessment questions | Preliminary position | Required action |
|---|---|---|---|
| Securities and Futures Act 2001 | Does the token constitute a capital markets product? Is an offer or dealing activity involved? | [analysis] | [licence, exemption, restriction or advice] |
| Payment Services Act 2019 | Are account issuance, domestic/cross-border transfer, merchant acquisition, e-money, or DPT services provided? | [analysis] | [licence class, exemption or scope control] |
| Financial Advisers Act 2001 | Is advice or a recommendation concerning an investment product provided? | [analysis] | [control or authorisation] |
| AML/CFT and sanctions | Which MAS notices and guidelines apply to each regulated entity and activity? | [analysis] | [CDD, screening, monitoring and reporting] |
| Personal Data Protection Act 2012 | What personal data is processed, transferred, retained, or made immutable? | [analysis] | [DPIA, consent/basis, retention and access controls] |
| Technology risk / outsourcing | Is the system critical? Which cloud, custody, oracle, bridge, or vendor dependencies exist? | [analysis] | [risk assessment, contracts, testing and exit plan] |

### Participant protection

- Eligibility and admission: [criteria]
- Disclosures: [token rights, fees, risks, conflicts, redemption and insolvency]
- Complaints and disputes: [owner, response times, escalation]
- Asset safeguarding: [segregation, reconciliation, custody and recovery]
- Market integrity: [surveillance, manipulation controls, access suspension]

### Open legal and policy questions

1. [Question, why it matters, preferred interpretation, fallback design]
2. [Question, why it matters, preferred interpretation, fallback design]

## Technical Proposal

### Architecture

```text
[Participant] -> [Gateway / API] -> [Compliance controls]
       |                                  |
       v                                  v
[Custody / wallet] <-> [DLT network] <-> [Settlement adapter]
                               |
                               v
                     [Audit / reporting store]
```

Describe:

- Network model and governance: [permissioned/public, validators, upgrades]
- Token lifecycle: [issue, transfer, corporate action, redeem, burn]
- Settlement: [DvP/PvP model, finality, failure handling, reconciliation]
- Identity: [legal identity to wallet binding, KYC refresh, revocation]
- Smart contracts: [roles, controls, upgradeability, pause and recovery]
- Interoperability: [APIs, standards, bridges, oracle assumptions]

### Transaction flow

1. [Participant onboarding and wallet binding]
2. [Order or instruction creation]
3. [Pre-trade eligibility and balance checks]
4. [Asset and cash-leg locking]
5. [Atomic settlement or controlled rollback]
6. [Confirmation, reconciliation and regulatory reporting]

### Security and operational controls

| Risk | Preventive controls | Detective controls | Recovery |
|---|---|---|---|
| Key compromise | [MPC/HSM, approvals, least privilege] | [alerts, anomaly detection] | [freeze, rotation, recovery] |
| Smart-contract defect | [review, tests, formal methods] | [monitoring, invariants] | [pause, upgrade, compensation] |
| Privacy leakage | [data minimisation, off-chain PII] | [access audit] | [containment and notification] |
| Oracle / bridge failure | [allow-list, limits, redundancy] | [staleness checks] | [circuit breaker, manual process] |
| Service outage | [multi-zone design, capacity tests] | [SLO monitoring] | [RTO/RPO and tested runbook] |

### Data and reporting

- Data inventory and classification: [link]
- On-chain versus off-chain fields: [list and rationale]
- Retention and deletion: [periods and authority]
- Regulatory records and reports: [events, format, frequency, owner]
- Independent assurance: [security, controls, smart contracts, financial data]

## Risk Assessment

Score likelihood and impact from 1 (low) to 5 (high). Name an accountable owner
and provide evidence for closure.

| ID | Risk | L | I | Controls / treatment | Owner | Due date | Residual score |
|---|---|---:|---:|---|---|---|---:|
| R-01 | Regulatory classification changes | [ ] | [ ] | [modular scope and legal review gate] | [ ] | [ ] | [ ] |
| R-02 | Settlement finality mismatch | [ ] | [ ] | [atomic flow and reconciliation] | [ ] | [ ] | [ ] |
| R-03 | Smart-contract vulnerability | [ ] | [ ] | [audit, pause and upgrade plan] | [ ] | [ ] | [ ] |
| R-04 | Participant or key compromise | [ ] | [ ] | [MPC/HSM and transaction approvals] | [ ] | [ ] | [ ] |
| R-05 | AML/CFT control failure | [ ] | [ ] | [CDD, screening and monitoring] | [ ] | [ ] | [ ] |

## Roadmap

| Phase | Duration | Scope | Entry criteria | Exit evidence | Regulatory touchpoint |
|---|---|---|---|---|---|
| 0. Classification | [ ] | Legal and product perimeter | Approved concept | Legal memo, flow diagrams | Initial discussion |
| 1. Prototype | [ ] | Closed test environment | Architecture approved | Tests, threat model | Progress update |
| 2. Controlled pilot | [ ] | Named institutions and caps | Control readiness | Pilot report, incidents | Sandbox/pilot review |
| 3. Production readiness | [ ] | Limited launch | Licences/approvals and assurance | Audit, runbooks, disclosures | Go-live decision |
| 4. Scale | [ ] | New assets/participants | KPI and risk thresholds met | Periodic reports | Ongoing supervision |

### Pilot success and stop criteria

**Success:** [quantified settlement, control, resilience and participant targets]  
**Pause:** [security incident, unresolved reconciliation, control breach]  
**Stop:** [legal prohibition, loss of asset backing, critical control failure]

## Governance and Accountability

| Responsibility | Accountable role | Committee / approver |
|---|---|---|
| Regulatory classification | [General Counsel / Compliance] | [ ] |
| Product and disclosures | [Product Owner] | [ ] |
| Technology and security | [CTO / CISO] | [ ] |
| Safeguarding and reconciliation | [Finance / Operations] | [ ] |
| Incident management | [Incident Commander] | [ ] |

List conflicts of interest, related parties, outsourcing arrangements, change
approval, participant rule enforcement, and independent assurance.

## Conclusion and Requested Next Steps

[Summarise why the pilot is useful, its bounded risk, unresolved questions, and
the exact meeting, feedback, or regulatory pathway requested.]

## Appendices

- A. Legal classification memorandum
- B. Product terms and participant rulebook
- C. Architecture, data-flow and transaction-flow diagrams
- D. Threat model and smart-contract audit
- E. AML/CFT, sanctions and transaction-monitoring design
- F. Data protection impact assessment
- G. Business continuity, incident response and exit plans
- H. Pilot test plan and KPI definitions

## Completion Guide

1. Name one owner for every bracketed field and appendix.
2. Freeze the product facts before legal classification; inconsistent flows lead
   to inconsistent regulatory conclusions.
3. Trace each conclusion to a law, regulation, MAS notice/guideline, legal memo,
   or written design control. Record the source version and access date.
4. Separate current capability, pilot-only simulation, and future roadmap.
5. Quantify participant, transaction, asset, jurisdiction, and value limits.
6. Include contrary legal interpretations and the design fallback for each.
7. Reconcile all diagrams, API descriptions, token terms, and money flows.
8. Obtain sign-off from legal, compliance, security, operations, and executive
   management before external submission.
9. Remove confidential keys, personal data, credentials, and internal-only links.
10. Export a clean PDF and verify headings, tables, links, version, and page numbers.

## Reference Register

Verify applicability and current versions with counsel before submission.

| Source | Relevance | Version / access date |
|---|---|---|
| MAS, Payment Services Act and payment-services regulatory materials | Payment and DPT service perimeter | [ ] |
| MAS, Securities and Futures Act materials | Capital-markets product and activity perimeter | [ ] |
| MAS technology risk management notices and FAQs | Critical systems and technology controls | [ ] |
| MAS Financial Institutions Directory | Counterparty and licence-status checks | [ ] |
| MAS Project Guardian publications | Tokenisation use cases and industry context | [ ] |
| Singapore Statutes Online and PDPC guidance | Primary legislation and data protection | [ ] |

Official starting points:

- https://www.mas.gov.sg/regulation
- https://www.mas.gov.sg/schemes-and-initiatives/project-guardian
- https://eservices.mas.gov.sg/fid
- https://sso.agc.gov.sg
- https://www.pdpc.gov.sg
