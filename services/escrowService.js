class MultiStepEscrowService {
  constructor() {
    this.steps = ['deposit', 'confirm_deposit', 'milestone_set', 'milestone_approved', 
                  'milestone_paid', 'final_review', 'release', 'dispute'];
    this.escrows = new Map();
  }

  createEscrow(buyer, seller, totalAmount, currency, milestones) {
    const id = `ESC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const escrow = {
      id, buyer, seller, totalAmount, currency,
      milestones: milestones.map((m, i) => ({
        step: i + 1,
        description: m.description || `Milestone ${i + 1}`,
        amount: m.amount,
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
        paidAt: null
      })),
      currentStep: 'deposit',
      depositedAt: null,
      totalDeposited: 0,
      totalReleased: 0,
      status: 'created',
      createdAt: new Date().toISOString(),
      history: [{ step: 'created', timestamp: new Date().toISOString(), detail: 'Escrow created' }]
    };
    this.escrows.set(id, escrow);
    return escrow;
  }

  deposit(id, amount) {
    const escrow = this.escrows.get(id);
    if (!escrow) throw new Error('Escrow not found');
    if (escrow.status !== 'created') throw new Error(`Cannot deposit: escrow is ${escrow.status}`);
    
    escrow.totalDeposited += amount;
    escrow.depositedAt = new Date().toISOString();
    
    if (escrow.totalDeposited >= escrow.totalAmount) {
      escrow.status = 'funded';
      escrow.currentStep = 'confirm_deposit';
    }
    
    escrow.history.push({
      step: 'deposit',
      timestamp: new Date().toISOString(),
      detail: `Deposited ${amount} ${escrow.currency} (total: ${escrow.totalDeposited}/${escrow.totalAmount})`
    });
    
    return escrow;
  }

  approveMilestone(id, milestoneStep, approver) {
    const escrow = this.escrows.get(id);
    if (!escrow) throw new Error('Escrow not found');
    
    const milestone = escrow.milestones.find(m => m.step === milestoneStep);
    if (!milestone) throw new Error(`Milestone ${milestoneStep} not found`);
    if (milestone.status !== 'pending') throw new Error('Milestone already processed');
    
    milestone.status = 'approved';
    milestone.approvedBy = approver;
    milestone.approvedAt = new Date().toISOString();
    escrow.currentStep = 'milestone_approved';
    
    escrow.history.push({
      step: `milestone_${milestoneStep}_approved`,
      timestamp: new Date().toISOString(),
      detail: `Milestone ${milestoneStep} approved by ${approver}`
    });
    
    return escrow;
  }

  releaseMilestone(id, milestoneStep) {
    const escrow = this.escrows.get(id);
    if (!escrow) throw new Error('Escrow not found');
    
    const milestone = escrow.milestones.find(m => m.step === milestoneStep);
    if (!milestone) throw new Error(`Milestone ${milestoneStep} not found`);
    if (milestone.status !== 'approved') throw new Error('Milestone not yet approved');
    
    milestone.status = 'paid';
    milestone.paidAt = new Date().toISOString();
    escrow.totalReleased += milestone.amount;
    escrow.currentStep = 'milestone_paid';
    
    const allPaid = escrow.milestones.every(m => m.status === 'paid');
    if (allPaid) {
      escrow.status = 'completed';
      escrow.currentStep = 'final_review';
    }
    
    escrow.history.push({
      step: `milestone_${milestoneStep}_released`,
      timestamp: new Date().toISOString(),
      detail: `Released ${milestone.amount} ${escrow.currency}`
    });
    
    return escrow;
  }

  getStatus(id) {
    const escrow = this.escrows.get(id);
    if (!escrow) throw new Error('Escrow not found');
    return {
      id: escrow.id,
      status: escrow.status,
      currentStep: escrow.currentStep,
      totalAmount: escrow.totalAmount,
      deposited: escrow.totalDeposited,
      released: escrow.totalReleased,
      milestones: escrow.milestones,
      steps: this.steps
    };
  }

  getEscrow(id) {
    return this.escrows.get(id);
  }
}

module.exports = new MultiStepEscrowService();
