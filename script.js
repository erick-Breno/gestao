class BankBalanceTracker {
  constructor() {
    this.supabase = window.createSupabaseClient()

    this.currentUser = null
    this.currentUserId = null
    this.banks = []
    this.transactions = []
    this.creditCards = []
    this.installments = []
    this.currentBankFilter = "all"
    this.currentView = "home"
    this.chart = null
    this.echarts = window.echarts
    this.transactionToDelete = null
    this.bankToEdit = null
    this.creditCardToEdit = null

    this.init()
  }

  init() {
    this.checkLoginStatus()
    this.setupEventListeners()
    this.setCurrentDate()
    this.initMobileNavigation()
  }

  initMobileNavigation() {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        const section = e.currentTarget.getAttribute("data-section")
        if (section) {
          this.switchView(section)
        }
      })
    })
    this.switchView("home-section")
  }

  switchView(sectionId) {
    this.currentView = sectionId

    // Update active nav item
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active")
      if (item.getAttribute("data-section") === sectionId) {
        item.classList.add("active")
      }
    })

    // Hide all sections
    document.querySelectorAll(".nav-section").forEach((section) => {
      section.classList.remove("active")
    })

    // Show current view
    const currentSection = document.getElementById(sectionId)
    if (currentSection) {
      currentSection.classList.add("active")
    }

    // Update chart if switching to charts view
    if (sectionId === "charts-section") {
      setTimeout(() => this.updateChart(), 100)
    }
  }

  /**
   * Checks if a user is currently logged in from Supabase session.
   */
  async checkLoginStatus() {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession()

      if (session?.user) {
        this.currentUserId = session.user.id
        this.currentUser = session.user.email

        this.hideLoginPage()
        await this.loadUserData()
        this.updateUI()
      } else {
        this.showLoginPage()
      }
    } catch (error) {
      console.error("Erro ao verificar login:", error)
      this.showLoginPage()
    }
  }

  /**
   * Sets up all event listeners for the application.
   */
  setupEventListeners() {
    // Login form
    document.getElementById("login-form").addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleLogin()
    })

    // Logout button
    document.getElementById("logout-btn").addEventListener("click", () => {
      this.handleLogout()
    })

    // Add bank button
    document.getElementById("add-bank-btn").addEventListener("click", () => {
      this.showBankModal()
    })

    // Bank form
    document.getElementById("bank-form").addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleBankSubmit()
    })

    // Transaction form
    document.getElementById("transaction-form").addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleTransactionSubmit()
    })

    // Close bank modal
    document.getElementById("close-modal").addEventListener("click", () => {
      this.hideBankModal()
    })

    document.getElementById("cancel-bank").addEventListener("click", () => {
      this.hideBankModal()
    })

    // Delete confirmation modal
    document.getElementById("cancel-delete").addEventListener("click", () => {
      this.hideDeleteModal()
    })

    document.getElementById("confirm-delete").addEventListener("click", () => {
      this.confirmDelete()
    })

    // Chart filters
    document.getElementById("chart-bank-filter").addEventListener("change", (e) => {
      this.currentBankFilter = e.target.value
      this.updateChart()
    })

    document.getElementById("chart-type-filter").addEventListener("change", () => {
      this.updateChart()
    })

    // Close modals on outside click
    document.getElementById("bank-modal").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) {
        this.hideBankModal()
      }
    })

    document.getElementById("delete-modal").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) {
        this.hideDeleteModal()
      }
    })

    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("bank-tab")) {
        const filter = e.target.getAttribute("data-filter")
        if (filter) {
          this.setCurrentBankFilter(filter)
        }
      }
    })

    document.getElementById("payment-method").addEventListener("change", (e) => {
      this.handlePaymentMethodChange(e.target.value)
    })

    document.getElementById("card-form").addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleCreditCardSubmit()
    })

    document.getElementById("close-card-modal").addEventListener("click", () => {
      this.hideCreditCardModal()
    })

    document.getElementById("cancel-card").addEventListener("click", () => {
      this.hideCreditCardModal()
    })

    document.getElementById("add-card-btn").addEventListener("click", () => {
      this.showCreditCardModal()
    })

    // Close modals with ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.hideBankModal()
        this.hideDeleteModal()
        this.hideCreditCardModal()
      }
    })
  }

  /**
   * Handles user login via Supabase Auth.
   */
  async handleLogin() {
    const emailInput = document.getElementById("email")
    const passwordInput = document.getElementById("password")
    const errorDiv = document.getElementById("login-error")

    const email = emailInput.value.trim()
    const password = passwordInput.value

    if (!email || !password) {
      this.showError("Por favor, preencha todos os campos.", errorDiv)
      return
    }

    try {
      // Try to sign in with email and password
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (error) {
        throw new Error("Email ou senha incorretos")
      }

      this.currentUserId = data.user.id
      this.currentUser = data.user.email

      this.hideLoginPage()
      await this.loadUserData()
      this.updateUI()

      errorDiv.classList.add("hidden")
      emailInput.value = ""
      passwordInput.value = ""

      console.log(`✅ Login realizado: ${email}`)
    } catch (error) {
      console.error("Erro no login:", error)
      this.showError("Email ou senha incorretos!", errorDiv)
      passwordInput.value = ""
      passwordInput.focus()
    }
  }

  /**
   * Handles user logout.
   */
  async handleLogout() {
    try {
      await this.supabase.auth.signOut()
    } catch (error) {
      console.error("Erro no logout:", error)
    }

    this.currentUser = null
    this.currentUserId = null
    this.banks = []
    this.transactions = []
    this.creditCards = []
    this.installments = []

    this.showLoginPage()
    this.updateUI()

    console.log("🚪 Logout realizado")
  }

  showError(message, errorDiv) {
    if (errorDiv) {
      errorDiv.textContent = message
      errorDiv.classList.remove("hidden")
    }
  }

  hideError(errorDiv) {
    if (errorDiv) {
      errorDiv.classList.add("hidden")
    }
  }

  showLoginPage() {
    document.getElementById("login-page").classList.remove("hidden")
    document.querySelector(".navbar").classList.add("hidden")
    document.querySelector("main").classList.add("hidden")
    document.querySelector(".mobile-nav").classList.add("hidden")
  }

  hideLoginPage() {
    document.getElementById("login-page").classList.add("hidden")
    document.querySelector(".navbar").classList.remove("hidden")
    document.querySelector("main").classList.remove("hidden")
    document.querySelector(".mobile-nav").classList.remove("hidden")
  }

  /**
   * Loads all user data from Supabase.
   */
  async loadUserData() {
    if (!this.currentUserId) return

    try {
      // Load banks
      const { data: banks, error: banksError } = await this.supabase
        .from("banks")
        .select("*")
        .eq("user_id", this.currentUserId)
        .order("created_at", { ascending: true })

      if (banksError) throw banksError

      this.banks = banks.map((bank) => ({
        ...bank,
        initialBalance: Number.parseFloat(bank.initial_balance),
      }))

      // Load transactions
      const { data: transactions, error: transactionsError } = await this.supabase
        .from("transactions")
        .select("*")
        .eq("user_id", this.currentUserId)
        .order("created_at", { ascending: false })

      if (transactionsError) throw transactionsError

      this.transactions = transactions.map((transaction) => ({
        ...transaction,
        bankId: transaction.bank_id,
        amount: Number.parseFloat(transaction.amount),
        creditCardId: transaction.credit_card_id,
        installments: transaction.installments,
        isCreditCardTransaction: transaction.is_credit_card_transaction,
      }))

      // Load credit cards
      const { data: creditCards, error: cardsError } = await this.supabase
        .from("credit_cards")
        .select("*")
        .eq("user_id", this.currentUserId)
        .order("created_at", { ascending: true })

      if (cardsError) throw cardsError

      this.creditCards = creditCards.map((card) => ({
        ...card,
        creditLimit: Number.parseFloat(card.credit_limit),
        currentBalance: Number.parseFloat(card.current_balance),
        closingDay: card.closing_day,
        dueDay: card.due_day,
      }))

      // Load installments
      const { data: installments, error: installmentsError } = await this.supabase
        .from("installments")
        .select("*")
        .eq("user_id", this.currentUserId)
        .order("due_date", { ascending: true })

      if (installmentsError) throw installmentsError

      this.installments = installments.map((installment) => ({
        ...installment,
        amount: Number.parseFloat(installment.amount),
        installmentNumber: installment.installment_number,
        totalInstallments: installment.total_installments,
        dueDate: installment.due_date,
        isPaid: installment.is_paid,
        creditCardId: installment.credit_card_id,
        transactionId: installment.transaction_id,
      }))

      console.log(
        `📊 Dados carregados: ${this.banks.length} bancos, ${this.transactions.length} transações, ${this.creditCards.length} cartões`,
      )
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      alert("Erro ao carregar dados do servidor. Tente novamente.")
      this.banks = []
      this.transactions = []
      this.creditCards = []
      this.installments = []
    }
  }

  /**
   * Shows bank modal for add/edit.
   */
  showBankModal(bankData = null) {
    const modal = document.getElementById("bank-modal")
    const title = document.getElementById("modal-title")
    const nameInput = document.getElementById("bank-name")
    const balanceInput = document.getElementById("initial-balance")

    if (bankData) {
      title.textContent = "Editar Banco"
      nameInput.value = bankData.name
      balanceInput.value = bankData.initialBalance.toFixed(2)
      this.bankToEdit = bankData.id
    } else {
      title.textContent = "Adicionar Banco"
      nameInput.value = ""
      balanceInput.value = "0.00"
      this.bankToEdit = null
    }

    modal.classList.remove("hidden")
    nameInput.focus()
  }

  hideBankModal() {
    document.getElementById("bank-modal").classList.add("hidden")
    document.getElementById("bank-form").reset()
    this.bankToEdit = null
  }

  /**
   * Handles bank form submission.
   */
  async handleBankSubmit() {
    const name = document.getElementById("bank-name").value.trim()
    const initialBalance = Number.parseFloat(document.getElementById("initial-balance").value) || 0

    if (!name) {
      alert("Por favor, insira o nome do banco.")
      return
    }

    if (!this.currentUserId) {
      alert("Erro: usuário não autenticado.")
      return
    }

    try {
      if (this.bankToEdit) {
        // Update existing bank
        const { error } = await this.supabase
          .from("banks")
          .update({
            name: name,
            initial_balance: initialBalance,
          })
          .eq("id", this.bankToEdit)
          .eq("user_id", this.currentUserId)

        if (error) throw error

        // Update local data
        const bankIndex = this.banks.findIndex((b) => b.id === this.bankToEdit)
        if (bankIndex !== -1) {
          this.banks[bankIndex].name = name
          this.banks[bankIndex].initialBalance = initialBalance
        }

        console.log(`✏️ Banco editado: ${name}`)
      } else {
        // Create new bank
        const { data, error } = await this.supabase
          .from("banks")
          .insert({
            user_id: this.currentUserId,
            name: name,
            initial_balance: initialBalance,
          })
          .select()
          .single()

        if (error) throw error

        // Add to local data
        this.banks.push({
          id: data.id,
          name: name,
          initialBalance: initialBalance,
          createdAt: data.created_at,
        })

        console.log(`➕ Banco adicionado: ${name}`)
      }

      this.updateUI()
      this.hideBankModal()
    } catch (error) {
      console.error("Erro ao salvar banco:", error)
      alert("Erro ao salvar banco. Tente novamente.")
    }
  }

  editBank(bankId) {
    const bank = this.banks.find((b) => b.id === bankId)
    if (bank) {
      this.showBankModal(bank)
    }
  }

  async deleteBank(bankId) {
    const bank = this.banks.find((b) => b.id === bankId)
    if (!bank) return

    this.transactionToDelete = { type: "bank", id: bankId, name: bank.name }
    const modal = document.getElementById("delete-modal")
    const modalText = modal?.querySelector(".modal-text")

    if (modalText) {
      modalText.textContent = `Tem certeza que deseja excluir o banco "${bank.name}" e todas as suas transações? Esta ação não pode ser desfeita.`
    }

    if (modal) {
      modal.classList.remove("hidden")
    }
  }

  /**
   * Handles transaction form submission.
   */
  async handleTransactionSubmit() {
    const description = document.getElementById("description").value.trim()
    const amount = Number.parseFloat(document.getElementById("amount").value)
    const type = document.querySelector('input[name="type"]:checked').value
    const category = document.getElementById("category").value
    const paymentMethod = document.getElementById("payment-method").value
    const bankId = paymentMethod === "bank" ? document.getElementById("bank-select").value || null : null
    const creditCardId = paymentMethod === "credit" ? document.getElementById("credit-card-select").value || null : null
    const installments =
      paymentMethod === "credit" ? Number.parseInt(document.getElementById("installments").value) || 1 : 1
    const date = document.getElementById("date").value

    if (!description || isNaN(amount) || amount <= 0 || !category || !date) {
      alert("Por favor, preencha todos os campos corretamente.")
      return
    }

    if (paymentMethod === "credit" && !creditCardId) {
      alert("Por favor, selecione um cartão de crédito.")
      return
    }

    if (!this.currentUserId) {
      alert("Erro: usuário não autenticado.")
      return
    }

    try {
      const { data, error } = await this.supabase
        .from("transactions")
        .insert({
          user_id: this.currentUserId,
          bank_id: bankId,
          credit_card_id: creditCardId,
          description: description,
          amount: amount,
          type: type,
          category: category,
          date: date,
          installments: installments,
          is_credit_card_transaction: paymentMethod === "credit",
        })
        .select()
        .single()

      if (error) throw error

      // Handle credit card installments
      if (paymentMethod === "credit" && installments > 1) {
        await this.createInstallments(data.id, creditCardId, amount / installments, installments, date)
      }

      // Update credit card balance
      if (paymentMethod === "credit" && type === "despesa") {
        await this.updateCreditCardBalance(creditCardId, amount)
      }

      // Add to local data
      this.transactions.unshift({
        id: data.id,
        description,
        amount,
        type,
        category,
        bankId: bankId,
        creditCardId: creditCardId,
        date,
        installments,
        isCreditCardTransaction: paymentMethod === "credit",
        createdAt: data.created_at,
      })

      this.resetTransactionForm()
      this.updateUI()

      console.log(`💰 Transação adicionada: ${description} - ${this.formatCurrency(amount)}`)
    } catch (error) {
      console.error("Erro ao salvar transação:", error)
      alert("Erro ao salvar transação. Tente novamente.")
    }
  }

  async createInstallments(transactionId, creditCardId, installmentAmount, totalInstallments, startDate) {
    const installmentsData = []
    const baseDate = new Date(startDate)

    for (let i = 1; i <= totalInstallments; i++) {
      const dueDate = new Date(baseDate)
      dueDate.setMonth(dueDate.getMonth() + i - 1)

      installmentsData.push({
        user_id: this.currentUserId,
        transaction_id: transactionId,
        credit_card_id: creditCardId,
        installment_number: i,
        total_installments: totalInstallments,
        amount: installmentAmount,
        due_date: dueDate.toISOString().split("T")[0],
        is_paid: false,
      })
    }

    const { error } = await this.supabase.from("installments").insert(installmentsData)

    if (error) throw error

    // Add to local data
    this.installments.push(
      ...installmentsData.map((inst) => ({
        ...inst,
        installmentNumber: inst.installment_number,
        totalInstallments: inst.total_installments,
        dueDate: inst.due_date,
        isPaid: inst.is_paid,
        creditCardId: inst.credit_card_id,
        transactionId: inst.transaction_id,
      })),
    )
  }

  async updateCreditCardBalance(creditCardId, amount) {
    const cardIndex = this.creditCards.findIndex((c) => c.id === creditCardId)
    if (cardIndex === -1) return

    const newBalance = this.creditCards[cardIndex].currentBalance + amount

    const { error } = await this.supabase
      .from("credit_cards")
      .update({ current_balance: newBalance })
      .eq("id", creditCardId)
      .eq("user_id", this.currentUserId)

    if (error) throw error

    this.creditCards[cardIndex].currentBalance = newBalance
  }

  deleteTransaction(transactionId) {
    const transaction = this.transactions.find((t) => t.id === transactionId)
    if (!transaction) return

    this.transactionToDelete = { type: "transaction", id: transactionId, name: transaction.description }
    const modal = document.getElementById("delete-modal")
    const modalText = modal?.querySelector(".modal-text")

    if (modalText) {
      modalText.textContent = `Tem certeza que deseja excluir a transação "${transaction.description}"? Esta ação não pode ser desfeita.`
    }

    if (modal) {
      modal.classList.remove("hidden")
    }
  }

  async confirmDelete() {
    if (!this.transactionToDelete) return

    const { type, id } = this.transactionToDelete

    try {
      if (type === "bank") {
        // Delete bank and all its transactions
        const { error } = await this.supabase.from("banks").delete().eq("id", id).eq("user_id", this.currentUserId)

        if (error) throw error

        this.banks = this.banks.filter((b) => b.id !== id)
        this.transactions = this.transactions.filter((t) => t.bankId !== id)

        console.log(`🗑️ Banco excluído`)
      } else if (type === "card") {
        // Delete credit card
        const { error } = await this.supabase
          .from("credit_cards")
          .delete()
          .eq("id", id)
          .eq("user_id", this.currentUserId)

        if (error) throw error

        this.creditCards = this.creditCards.filter((c) => c.id !== id)
        this.transactions = this.transactions.filter((t) => t.creditCardId !== id)
        this.installments = this.installments.filter((i) => i.creditCardId !== id)

        console.log(`🗑️ Cartão excluído`)
      } else if (type === "transaction") {
        // Delete transaction
        const { error } = await this.supabase
          .from("transactions")
          .delete()
          .eq("id", id)
          .eq("user_id", this.currentUserId)

        if (error) throw error

        this.transactions = this.transactions.filter((t) => t.id !== id)

        console.log(`🗑️ Transação excluída`)
      }

      this.updateUI()
      this.hideDeleteModal()
    } catch (error) {
      console.error("Erro ao excluir:", error)
      alert("Erro ao excluir. Tente novamente.")
    }
  }

  hideDeleteModal() {
    document.getElementById("delete-modal").classList.add("hidden")
    this.transactionToDelete = null
  }

  resetTransactionForm() {
    document.getElementById("transaction-form").reset()
    this.setCurrentDate()
    document.querySelector('input[name="type"][value="receita"]').checked = true
    document.getElementById("payment-method").value = "bank"
    this.handlePaymentMethodChange("bank")
  }

  setCurrentDate() {
    const dateInput = document.getElementById("date")
    if (dateInput) {
      dateInput.valueAsDate = new Date()
    }
  }

  updateUI() {
    this.renderBanks()
    this.renderBankTabs()
    this.updateBankSelect()
    this.updateChartBankFilter()
    this.renderTransactions()
    this.updateSummary()
    this.updateChart()
    this.renderCreditCards()
    this.updateCreditCardSelect()
  }

  renderBanks() {
    const container = document.getElementById("banks-container")

    if (this.banks.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; padding: var(--spacing-2xl); text-align: center;">
          <i class="ri-bank-line" style="font-size: 3rem; color: var(--text-muted); margin-bottom: var(--spacing-md);"></i>
          <p style="color: var(--text-muted); font-size: 1rem; font-weight: 500; margin-bottom: var(--spacing-sm);">Nenhum banco cadastrado</p>
          <small style="color: var(--text-muted); font-size: 0.875rem;">Clique em "Adicionar Banco" para começar</small>
        </div>
      `
      return
    }

    const bankCards = this.banks
      .map((bank) => {
        const balance = this.calculateBankBalance(bank.id)
        const transactionCount = this.transactions.filter((t) => t.bankId === bank.id).length
        const balanceClass = balance > 0 ? "positive" : balance < 0 ? "negative" : "zero"

        return `
        <div class="bank-card">
          <div class="bank-card-header">
            <h3 class="bank-name">🏦 ${bank.name}</h3>
            <div class="bank-actions">
              <button class="bank-action-btn" onclick="app.editBank('${bank.id}')" title="Editar banco">
                <i class="ri-edit-line"></i>
              </button>
              <button class="bank-action-btn" onclick="app.deleteBank('${bank.id}')" title="Excluir banco">
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>
          </div>
          <div class="bank-balance ${balanceClass}">
            ${this.formatCurrency(balance)}
          </div>
          <div class="bank-transactions-count">
            ${transactionCount} transação${transactionCount !== 1 ? "ões" : ""}
          </div>
        </div>
      `
      })
      .join("")

    container.innerHTML = bankCards
  }

  renderBankTabs() {
    const container = document.getElementById("bank-tabs")

    let tabs = `
      <button class="bank-tab ${this.currentBankFilter === "all" ? "active" : ""}" data-filter="all">
        Todos os Bancos
      </button>
      <button class="bank-tab ${this.currentBankFilter === "none" ? "active" : ""}" data-filter="none">
        💵 Dinheiro
      </button>
    `

    tabs += this.banks
      .map(
        (bank) => `
      <button class="bank-tab ${this.currentBankFilter === bank.id ? "active" : ""}" data-filter="${bank.id}">
        🏦 ${bank.name}
      </button>
    `,
      )
      .join("")

    container.innerHTML = tabs
  }

  setCurrentBankFilter(filter) {
    this.currentBankFilter = filter.toString()

    document.querySelectorAll(".bank-tab").forEach((tab) => {
      const tabFilter = tab.getAttribute("data-filter")
      if (tabFilter === this.currentBankFilter) {
        tab.classList.add("active")
      } else {
        tab.classList.remove("active")
      }
    })

    this.renderTransactions()
    this.updateSummary()
    this.updateChart()
  }

  updateBankSelect() {
    const select = document.getElementById("bank-select")

    let options = '<option value="">💵 Dinheiro/Nenhum</option>'
    options += this.banks.map((bank) => `<option value="${bank.id}">${bank.name}</option>`).join("")

    select.innerHTML = options
  }

  updateChartBankFilter() {
    const select = document.getElementById("chart-bank-filter")

    let options = '<option value="all">Todos os Bancos</option>'
    options += this.banks.map((bank) => `<option value="${bank.id}">${bank.name}</option>`).join("")

    select.innerHTML = options
    select.value = this.currentBankFilter
  }

  renderTransactions() {
    const list = document.getElementById("transactions-list")

    let filteredTransactions = [...this.transactions]

    if (this.currentBankFilter !== "all") {
      if (this.currentBankFilter === "none") {
        filteredTransactions = filteredTransactions.filter((t) => !t.bankId)
      } else {
        filteredTransactions = filteredTransactions.filter((t) => t.bankId === this.currentBankFilter)
      }
    }

    if (filteredTransactions.length === 0) {
      list.innerHTML = `
        <li class="no-transactions">
          <div class="empty-state">
            <i class="ri-file-list-line"></i>
            <p>Nenhuma transação encontrada</p>
            <small>Adicione uma nova transação acima</small>
          </div>
        </li>
      `
      return
    }

    const sortedTransactions = [...filteredTransactions].sort((a, b) => new Date(b.date) - new Date(a.date))

    list.innerHTML = sortedTransactions
      .map((transaction) => {
        const bank = this.banks.find((b) => b.id === transaction.bankId)
        const card = this.creditCards.find((c) => c.id === transaction.creditCardId)

        let paymentMethod = "💵 Dinheiro"
        if (bank) paymentMethod = `🏦 ${bank.name}`
        if (card) paymentMethod = `💳 ${card.name}`

        const isIncome = transaction.type === "receita"
        const icon = isIncome ? "ri-arrow-up-circle-line" : "ri-arrow-down-circle-line"
        const iconClass = isIncome ? "income" : "expense"
        const amountClass = isIncome ? "income" : "expense"
        const amountPrefix = isIncome ? "+" : "-"

        return `
        <li class="transaction-item">
          <div class="transaction-info">
            <div class="transaction-icon ${iconClass}">
              <i class="${icon}"></i>
            </div>
            <div class="transaction-details">
              <h4>${transaction.description}</h4>
              <div class="transaction-meta">
                <span>${transaction.category}</span>
                <span>•</span>
                <span>${paymentMethod}</span>
                <span>•</span>
                <span>${this.formatDate(transaction.date)}</span>
              </div>
            </div>
          </div>
          <div class="transaction-amount">
            <span class="amount-value ${amountClass}">
              ${amountPrefix}${this.formatCurrency(transaction.amount)}
            </span>
            <button class="delete-btn" onclick="app.deleteTransaction('${transaction.id}')" title="Excluir transação">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
        </li>
      `
      })
      .join("")
  }

  updateSummary() {
    let filteredTransactions = this.transactions

    if (this.currentBankFilter !== "all") {
      if (this.currentBankFilter === "none") {
        filteredTransactions = filteredTransactions.filter((t) => !t.bankId)
      } else {
        filteredTransactions = filteredTransactions.filter((t) => t.bankId === this.currentBankFilter)
      }
    }

    const totalIncome = filteredTransactions.filter((t) => t.type === "receita").reduce((sum, t) => sum + t.amount, 0)
    const totalExpense = filteredTransactions.filter((t) => t.type === "despesa").reduce((sum, t) => sum + t.amount, 0)
    const balance = totalIncome - totalExpense

    let initialBalance = 0
    if (this.currentBankFilter === "all") {
      initialBalance = this.banks.reduce((sum, bank) => sum + (bank.initialBalance || 0), 0)
    } else if (this.currentBankFilter !== "none") {
      const bank = this.banks.find((b) => b.id === this.currentBankFilter)
      if (bank) {
        initialBalance = bank.initialBalance || 0
      }
    }

    const finalBalance = balance + initialBalance

    document.getElementById("total-receitas").textContent = this.formatCurrency(totalIncome)
    document.getElementById("total-despesas").textContent = this.formatCurrency(totalExpense)
    document.getElementById("saldo-total").textContent = this.formatCurrency(finalBalance)
  }

  calculateBankBalance(bankId) {
    const bank = this.banks.find((b) => b.id === bankId)
    if (!bank) return 0

    const bankTransactions = this.transactions.filter((t) => t.bankId === bankId)
    const income = bankTransactions.filter((t) => t.type === "receita").reduce((sum, t) => sum + t.amount, 0)
    const expense = bankTransactions.filter((t) => t.type === "despesa").reduce((sum, t) => sum + t.amount, 0)

    return bank.initialBalance + income - expense
  }

  updateChart() {
    const chartType = document.getElementById("chart-type-filter").value
    const bankFilter = document.getElementById("chart-bank-filter").value

    let filteredTransactions = this.transactions

    if (bankFilter !== "all") {
      filteredTransactions = filteredTransactions.filter((t) => t.bankId === bankFilter)
    }

    const chartDom = document.getElementById("chart")

    if (this.chart) {
      this.chart.dispose()
    }

    try {
      this.chart = this.echarts.init(chartDom, "dark")
    } catch (error) {
      console.error("Erro ao inicializar gráfico:", error)
      chartDom.innerHTML =
        '<div style="display: flex; align-items: center; justify-content: center; height: 400px; color: #64748b;">📊 Erro ao carregar gráfico</div>'
      return
    }

    let option

    switch (chartType) {
      case "category":
        option = this.getCategoryChartOption(filteredTransactions)
        break
      case "bank":
        option = this.getBankChartOption()
        break
      case "timeline":
        option = this.getTimelineChartOption(filteredTransactions)
        break
      default:
        option = this.getCategoryChartOption(filteredTransactions)
    }

    try {
      this.chart.setOption(option)
    } catch (error) {
      console.error("Erro ao renderizar gráfico:", error)
      chartDom.innerHTML =
        '<div style="display: flex; align-items: center; justify-content: center; height: 400px; color: #64748b;">📊 Erro ao renderizar gráfico</div>'
      return
    }

    window.addEventListener("resize", () => {
      if (this.chart) {
        this.chart.resize()
      }
    })
  }

  getCategoryChartOption(transactions) {
    const categoryData = {}

    transactions.forEach((t) => {
      if (t.type === "despesa") {
        if (!categoryData[t.category]) {
          categoryData[t.category] = 0
        }
        categoryData[t.category] += t.amount
      }
    })

    if (Object.keys(categoryData).length === 0) {
      return {
        title: {
          text: "💸 Despesas por Categoria",
          subtext: "Nenhuma despesa encontrada",
          left: "center",
          textStyle: { color: "#f8fafc", fontSize: 18, fontWeight: 600 },
          subtextStyle: { color: "#64748b", fontSize: 14 },
        },
        graphic: {
          type: "text",
          left: "center",
          top: "middle",
          style: {
            text: "📊\n\nNenhuma despesa para exibir\nAdicione algumas transações",
            textAlign: "center",
            fill: "#64748b",
            fontSize: 16,
          },
        },
      }
    }

    const sortedCategories = Object.entries(categoryData)
      .sort(([, a], [, b]) => b - a)
      .reduce((acc, [key, value]) => {
        acc[key] = value
        return acc
      }, {})

    const categories = Object.keys(sortedCategories)
    const values = Object.values(sortedCategories)

    const colors = [
      "#ef4444",
      "#ec4899",
      "#22c55e",
      "#f97316",
      "#eab308",
      "#84cc16",
      "#06b6d4",
      "#3b82f6",
      "#8b5cf6",
      "#f59e0b",
    ]

    return {
      title: {
        text: "💸 Despesas por Categoria",
        left: "center",
        textStyle: { color: "#f8fafc", fontSize: 18, fontWeight: 600 },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(26, 13, 13, 0.95)",
        borderColor: "#ef4444",
        borderWidth: 2,
        textStyle: { color: "#f8fafc" },
        formatter: (params) => {
          if (params.length === 0) return "Sem dados"
          return `<strong>${params[0].name}</strong><br/>💰 ${this.formatCurrency(params[0].value)}`
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: "80px",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        axisLabel: {
          formatter: (value) => this.formatCurrency(value),
          color: "#cbd5e1",
        },
        axisLine: { lineStyle: { color: "#ef4444" } },
        splitLine: { lineStyle: { color: "#475569" } },
      },
      yAxis: {
        type: "category",
        data: categories,
        axisLabel: { color: "#cbd5e1" },
        axisLine: { lineStyle: { color: "#ef4444" } },
      },
      series: [
        {
          name: "Despesas",
          type: "bar",
          data: values.map((value, index) => ({
            value: value,
            itemStyle: { color: colors[index % colors.length] },
          })),
          itemStyle: { borderRadius: [0, 8, 8, 0] },
          barWidth: "70%",
          label: {
            show: true,
            position: "right",
            formatter: (params) => this.formatCurrency(params.value),
            color: "#cbd5e1",
            fontSize: 12,
            fontWeight: 500,
          },
        },
      ],
    }
  }

  getBankChartOption() {
    const bankData = this.banks.map((bank) => ({
      name: bank.name,
      value: Math.abs(this.calculateBankBalance(bank.id)),
      originalValue: this.calculateBankBalance(bank.id),
    }))

    const noBankTransactions = this.transactions.filter((t) => !t.bankId)
    const noBankIncome = noBankTransactions.filter((t) => t.type === "receita").reduce((sum, t) => sum + t.amount, 0)
    const noBankExpense = noBankTransactions.filter((t) => t.type === "despesa").reduce((sum, t) => sum + t.amount, 0)
    const noBankBalance = noBankIncome - noBankExpense

    if (Math.abs(noBankBalance) > 0) {
      bankData.push({
        name: "💵 Dinheiro",
        value: Math.abs(noBankBalance),
        originalValue: noBankBalance,
      })
    }

    if (bankData.length === 0 || bankData.every((item) => item.value === 0)) {
      return {
        title: {
          text: "🏦 Saldo por Banco",
          subtext: "Nenhum saldo encontrado",
          left: "center",
          textStyle: { color: "#f8fafc", fontSize: 18, fontWeight: 600 },
          subtextStyle: { color: "#64748b", fontSize: 14 },
        },
        graphic: {
          type: "text",
          left: "center",
          top: "middle",
          style: {
            text: "🏦\n\nNenhum saldo para exibir\nAdicione bancos e transações",
            textAlign: "center",
            fill: "#64748b",
            fontSize: 16,
          },
        },
      }
    }

    const colors = ["#22c55e", "#ec4899", "#ef4444", "#f97316", "#eab308", "#06b6d4", "#3b82f6", "#8b5cf6"]

    return {
      title: {
        text: "🏦 Saldo por Banco",
        left: "center",
        textStyle: { color: "#f8fafc", fontSize: 18, fontWeight: 600 },
      },
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(13, 26, 13, 0.95)",
        borderColor: "#22c55e",
        borderWidth: 2,
        textStyle: { color: "#f8fafc" },
        formatter: (params) => {
          const percentage = params.percent
          const originalValue = params.data.originalValue
          return `<strong>${params.name}</strong><br/>💰 ${this.formatCurrency(originalValue)} (${percentage}%)`
        },
      },
      series: [
        {
          name: "Saldo",
          type: "pie",
          radius: ["40%", "80%"],
          data: bankData.map((item, index) => ({
            ...item,
            itemStyle: { color: colors[index % colors.length] },
          })),
          itemStyle: {
            borderRadius: 10,
            borderColor: "#1e293b",
            borderWidth: 3,
          },
          label: {
            formatter: (params) => `${params.name}\n${this.formatCurrency(params.data.originalValue)}`,
            color: "#cbd5e1",
            fontSize: 12,
            fontWeight: 500,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 20,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.8)",
            },
            label: { fontSize: 14, fontWeight: 600 },
          },
        },
      ],
    }
  }

  getTimelineChartOption(transactions) {
    if (transactions.length === 0) {
      return {
        title: {
          text: "📈 Evolução Financeira",
          subtext: "Nenhuma transação encontrada",
          left: "center",
          textStyle: { color: "#f8fafc", fontSize: 18, fontWeight: 600 },
          subtextStyle: { color: "#64748b", fontSize: 14 },
        },
        graphic: {
          type: "text",
          left: "center",
          top: "middle",
          style: {
            text: "📈\n\nNenhuma transação para exibir\nAdicione algumas transações",
            textAlign: "center",
            fill: "#64748b",
            fontSize: 16,
          },
        },
      }
    }

    const monthlyData = {}

    transactions.forEach((t) => {
      const date = new Date(t.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expense: 0 }
      }

      if (t.type === "receita") {
        monthlyData[monthKey].income += t.amount
      } else {
        monthlyData[monthKey].expense += t.amount
      }
    })

    const sortedMonths = Object.keys(monthlyData).sort()
    const incomeData = sortedMonths.map((month) => monthlyData[month].income)
    const expenseData = sortedMonths.map((month) => monthlyData[month].expense)
    const balanceData = sortedMonths.map((month) => monthlyData[month].income - monthlyData[month].expense)

    return {
      title: {
        text: "📈 Evolução Financeira",
        left: "center",
        textStyle: { color: "#f8fafc", fontSize: 18, fontWeight: 600 },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(26, 13, 26, 0.95)",
        borderColor: "#ec4899",
        borderWidth: 2,
        textStyle: { color: "#f8fafc" },
        formatter: (params) => {
          let result = `<strong>${params[0].axisValue}</strong><br/>`
          params.forEach((param) => {
            const icon = param.seriesName === "💚 Receitas" ? "💚" : param.seriesName === "❤️ Despesas" ? "❤️" : "💖"
            result += `${icon} ${param.seriesName}: ${this.formatCurrency(param.value)}<br/>`
          })
          return result
        },
      },
      legend: {
        data: ["💚 Receitas", "❤️ Despesas", "💖 Saldo"],
        textStyle: { color: "#cbd5e1", fontSize: 12 },
        top: 50,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: "100px",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: sortedMonths.map((month) => {
          const [year, monthNum] = month.split("-")
          return new Date(year, monthNum - 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
        }),
        axisLabel: { color: "#cbd5e1" },
        axisLine: { lineStyle: { color: "#ec4899" } },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          formatter: (value) => this.formatCurrency(value),
          color: "#cbd5e1",
        },
        axisLine: { lineStyle: { color: "#ec4899" } },
        splitLine: { lineStyle: { color: "#475569", type: "dashed" } },
      },
      series: [
        {
          name: "💚 Receitas",
          type: "line",
          data: incomeData,
          itemStyle: { color: "#22c55e" },
          lineStyle: { width: 4, color: "#22c55e" },
          symbol: "circle",
          symbolSize: 8,
          smooth: true,
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(34, 197, 94, 0.3)" },
                { offset: 1, color: "rgba(34, 197, 94, 0.05)" },
              ],
            },
          },
        },
        {
          name: "❤️ Despesas",
          type: "line",
          data: expenseData,
          itemStyle: { color: "#ef4444" },
          lineStyle: { width: 4, color: "#ef4444" },
          symbol: "circle",
          symbolSize: 8,
          smooth: true,
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(239, 68, 68, 0.3)" },
                { offset: 1, color: "rgba(239, 68, 68, 0.05)" },
              ],
            },
          },
        },
        {
          name: "💖 Saldo",
          type: "line",
          data: balanceData,
          itemStyle: { color: "#ec4899" },
          lineStyle: { width: 5, color: "#ec4899", type: "solid" },
          symbol: "diamond",
          symbolSize: 10,
          smooth: true,
          emphasis: {
            focus: "series",
            lineStyle: { width: 6 },
          },
        },
      ],
    }
  }

  handlePaymentMethodChange(method) {
    const bankSelectGroup = document.getElementById("bank-select-group")
    const creditCardFields = document.getElementById("credit-card-fields")
    const bankSelect = document.getElementById("bank-select")
    const creditCardSelect = document.getElementById("credit-card-select")

    if (method === "credit") {
      bankSelectGroup.classList.add("hidden")
      creditCardFields.classList.remove("hidden")
      bankSelect.value = ""
    } else if (method === "bank") {
      bankSelectGroup.classList.remove("hidden")
      creditCardFields.classList.add("hidden")
      creditCardSelect.value = ""
    } else {
      bankSelectGroup.classList.add("hidden")
      creditCardFields.classList.add("hidden")
      bankSelect.value = ""
      creditCardSelect.value = ""
    }
  }

  showCreditCardModal(cardData = null) {
    const modal = document.getElementById("card-modal")
    const title = document.getElementById("card-modal-title")
    const nameInput = document.getElementById("card-name")
    const limitInput = document.getElementById("card-limit")
    const dueDayInput = document.getElementById("card-due-day")

    if (cardData) {
      title.textContent = "Editar Cartão"
      nameInput.value = cardData.name
      limitInput.value = cardData.creditLimit.toFixed(2)
      dueDayInput.value = cardData.dueDay
      this.creditCardToEdit = cardData.id
    } else {
      title.textContent = "Adicionar Cartão"
      nameInput.value = ""
      limitInput.value = "0.00"
      dueDayInput.value = "15"
      this.creditCardToEdit = null
    }

    modal.classList.remove("hidden")
    nameInput.focus()
  }

  hideCreditCardModal() {
    document.getElementById("card-modal").classList.add("hidden")
    document.getElementById("card-form").reset()
    this.creditCardToEdit = null
  }

  async handleCreditCardSubmit() {
    const name = document.getElementById("card-name").value.trim()
    const creditLimit = Number.parseFloat(document.getElementById("card-limit").value) || 0
    const dueDay = Number.parseInt(document.getElementById("card-due-day").value) || 15

    if (!name) {
      alert("Por favor, insira o nome do cartão.")
      return
    }

    if (!this.currentUserId) {
      alert("Erro: usuário não autenticado.")
      return
    }

    try {
      if (this.creditCardToEdit) {
        const { error } = await this.supabase
          .from("credit_cards")
          .update({
            name: name,
            credit_limit: creditLimit,
            due_day: dueDay,
          })
          .eq("id", this.creditCardToEdit)
          .eq("user_id", this.currentUserId)

        if (error) throw error

        const cardIndex = this.creditCards.findIndex((c) => c.id === this.creditCardToEdit)
        if (cardIndex !== -1) {
          this.creditCards[cardIndex].name = name
          this.creditCards[cardIndex].creditLimit = creditLimit
          this.creditCards[cardIndex].dueDay = dueDay
        }

        console.log(`✏️ Cartão editado: ${name}`)
      } else {
        const { data, error } = await this.supabase
          .from("credit_cards")
          .insert({
            user_id: this.currentUserId,
            name: name,
            credit_limit: creditLimit,
            current_balance: 0,
            closing_day: 1,
            due_day: dueDay,
          })
          .select()
          .single()

        if (error) throw error

        this.creditCards.push({
          id: data.id,
          name: name,
          creditLimit: creditLimit,
          currentBalance: 0,
          closingDay: 1,
          dueDay: dueDay,
          createdAt: data.created_at,
        })

        console.log(`➕ Cartão adicionado: ${name}`)
      }

      this.updateUI()
      this.hideCreditCardModal()
    } catch (error) {
      console.error("Erro ao salvar cartão:", error)
      alert("Erro ao salvar cartão. Tente novamente.")
    }
  }

  editCreditCard(cardId) {
    const card = this.creditCards.find((c) => c.id === cardId)
    if (card) {
      this.showCreditCardModal(card)
    }
  }

  async deleteCreditCard(cardId) {
    const card = this.creditCards.find((c) => c.id === cardId)
    if (!card) return

    this.transactionToDelete = { type: "card", id: cardId, name: card.name }
    const modal = document.getElementById("delete-modal")
    const modalText = modal?.querySelector(".modal-text")

    if (modalText) {
      modalText.textContent = `Tem certeza que deseja excluir o cartão "${card.name}" e todas as suas transações? Esta ação não pode ser desfeita.`
    }

    if (modal) {
      modal.classList.remove("hidden")
    }
  }

  renderCreditCards() {
    const container = document.getElementById("cards-container")

    if (this.creditCards.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; padding: var(--spacing-2xl); text-align: center;">
          <i class="ri-bank-card-line" style="font-size: 3rem; color: var(--text-muted); margin-bottom: var(--spacing-md);"></i>
          <p style="color: var(--text-muted); font-size: 1rem; font-weight: 500; margin-bottom: var(--spacing-sm);">Nenhum cartão cadastrado</p>
          <small style="color: var(--text-muted); font-size: 0.875rem;">Clique em "Adicionar Cartão" para começar</small>
        </div>
      `
      return
    }

    const cardCards = this.creditCards
      .map((card) => {
        const availableLimit = card.creditLimit - card.currentBalance
        const usagePercentage = card.creditLimit > 0 ? (card.currentBalance / card.creditLimit) * 100 : 0
        const limitClass = usagePercentage > 80 ? "negative" : usagePercentage > 60 ? "warning" : "positive"

        return `
        <div class="card-item">
          <div class="card-header">
            <h3 class="card-name">💳 ${card.name}</h3>
            <div class="card-actions">
              <button class="card-action-btn" onclick="app.editCreditCard('${card.id}')" title="Editar cartão">
                <i class="ri-edit-line"></i>
              </button>
              <button class="card-action-btn" onclick="app.deleteCreditCard('${card.id}')" title="Excluir cartão">
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>
          </div>
          <div class="card-limit">${this.formatCurrency(card.creditLimit)}</div>
          <div class="card-available ${limitClass}">
            Disponível: ${this.formatCurrency(availableLimit)}
          </div>
          <div class="card-due-date">
            Vencimento: dia ${card.dueDay}
          </div>
        </div>
      `
      })
      .join("")

    container.innerHTML = cardCards
  }

  updateCreditCardSelect() {
    const select = document.getElementById("credit-card-select")
    if (!select) return

    let options = '<option value="">Selecione um cartão</option>'
    options += this.creditCards.map((card) => `<option value="${card.id}">${card.name}</option>`).join("")

    select.innerHTML = options
  }

  formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString("pt-BR")
  }
}

// Initialize the app
const app = new BankBalanceTracker()

// Make functions available globally for onclick handlers
window.app = app
