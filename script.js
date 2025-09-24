class BankBalanceTracker {
  constructor() {
    this.users = {
      erick: "Gaby128",
      gabriela: "gaby128",
      admin: "admin",
    }

    this.currentUser = null
    this.banks = []
    this.transactions = []
    this.currentBankFilter = "all"
    this.chart = null
    this.echarts = window.echarts
    this.transactionToDelete = null
    this.bankToEdit = null

    this.init()
  }

  init() {
    this.checkLoginStatus()
    this.setupEventListeners()
    this.setCurrentDate()
  }

  /**
   * Checks if a user is currently logged in from localStorage.
   * Updates UI accordingly.
   */
  checkLoginStatus() {
    const storedUser = localStorage.getItem("currentUser")
    if (storedUser) {
      this.currentUser = storedUser
      this.hideLoginPage()
      this.loadUserData()
      this.updateUI()
    } else {
      this.showLoginPage()
    }
  }

  /**
   * Sets up all event listeners for the application.
   */
  setupEventListeners() {
    // Login form submission
    document.getElementById("login-form").addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleLogin()
    })

    // Logout button click
    document.getElementById("logout-btn").addEventListener("click", () => {
      this.handleLogout()
    })

    // Add bank button click
    document.getElementById("add-bank-btn").addEventListener("click", () => {
      this.showBankModal()
    })

    // Bank form submission (add/edit bank)
    document.getElementById("bank-form").addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleBankSubmit()
    })

    // Transaction form submission
    document.getElementById("transaction-form").addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleTransactionSubmit()
    })

    // Close bank modal buttons
    document.getElementById("close-modal").addEventListener("click", () => {
      this.hideBankModal()
    })

    document.getElementById("cancel-bank").addEventListener("click", () => {
      this.hideBankModal()
    })

    // Delete confirmation modal buttons
    document.getElementById("cancel-delete").addEventListener("click", () => {
      this.hideDeleteModal()
    })

    document.getElementById("confirm-delete").addEventListener("click", () => {
      this.confirmDelete()
    })

    // Chart filter changes
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
  }

  /**
   * Handles the user login process.
   */
  handleLogin() {
    const usernameInput = document.getElementById("username")
    const passwordInput = document.getElementById("password")
    const errorDiv = document.getElementById("login-error")

    const username = usernameInput.value.trim()
    const password = passwordInput.value

    if (!username || !password) {
      errorDiv.textContent = "Por favor, preencha todos os campos."
      errorDiv.classList.remove("hidden")
      return
    }

    if (this.users[username] && this.users[username] === password) {
      this.currentUser = username
      localStorage.setItem("currentUser", username)
      this.hideLoginPage()
      this.loadUserData()
      this.updateUI()
      errorDiv.classList.add("hidden") // Hide error on successful login

      // Clear login form
      usernameInput.value = ""
      passwordInput.value = ""
    } else {
      errorDiv.textContent = "Usuário ou senha incorretos. Tente novamente."
      errorDiv.classList.remove("hidden")
      passwordInput.value = "" // Clear password field for security
      passwordInput.focus()
    }
  }

  /**
   * Handles the user logout process.
   */
  handleLogout() {
    this.currentUser = null
    localStorage.removeItem("currentUser")
    this.banks = [] // Clear data on logout
    this.transactions = [] // Clear data on logout
    this.showLoginPage()
    this.updateUI() // Update UI to reflect logout state
  }

  /**
   * Shows the login page and hides the main content/navbar.
   */
  showLoginPage() {
    document.getElementById("login-page").classList.remove("hidden")
    document.querySelector(".navbar").classList.add("hidden")
    document.querySelector("main").classList.add("hidden")
  }

  /**
   * Hides the login page and shows the main content/navbar.
   */
  hideLoginPage() {
    document.getElementById("login-page").classList.add("hidden")
    document.querySelector(".navbar").classList.remove("hidden")
    document.querySelector("main").classList.remove("hidden")
  }

  /**
   * Loads user-specific data (banks and transactions) from localStorage.
   */
  loadUserData() {
    if (this.currentUser) {
      this.banks = JSON.parse(localStorage.getItem(`banks_${this.currentUser}`)) || []
      this.transactions = JSON.parse(localStorage.getItem(`transactions_${this.currentUser}`)) || []
    }
  }

  /**
   * Saves user-specific data (banks and transactions) to localStorage.
   */
  saveUserData() {
    if (this.currentUser) {
      localStorage.setItem(`banks_${this.currentUser}`, JSON.stringify(this.banks))
      localStorage.setItem(`transactions_${this.currentUser}`, JSON.stringify(this.transactions))
    }
  }

  /**
   * Shows the bank modal, pre-filling data if editing an existing bank.
   * @param {object} [bankData=null] - The bank object to edit, if any.
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

  /**
   * Hides the bank modal and resets its form.
   */
  hideBankModal() {
    document.getElementById("bank-modal").classList.add("hidden")
    document.getElementById("bank-form").reset()
    this.bankToEdit = null
  }

  /**
   * Handles the submission of the add/edit bank form.
   */
  handleBankSubmit() {
    const name = document.getElementById("bank-name").value.trim()
    const initialBalance = Number.parseFloat(document.getElementById("initial-balance").value) || 0

    if (!name) {
      alert("Por favor, insira o nome do banco.")
      return
    }

    if (this.bankToEdit) {
      // Edit existing bank
      const bankIndex = this.banks.findIndex((b) => b.id === this.bankToEdit)
      if (bankIndex !== -1) {
        this.banks[bankIndex].name = name
        this.banks[bankIndex].initialBalance = initialBalance
      }
    } else {
      // Add new bank
      const bank = {
        id: Date.now(), // Unique ID for the bank
        name: name,
        initialBalance: initialBalance,
        createdAt: new Date().toISOString(),
      }
      this.banks.push(bank)
    }

    this.saveUserData()
    this.updateUI()
    this.hideBankModal()
  }

  /**
   * Initiates the editing of a bank.
   * @param {number} bankId - The ID of the bank to edit.
   */
  editBank(bankId) {
    const bank = this.banks.find((b) => b.id === bankId)
    if (bank) {
      this.showBankModal(bank)
    }
  }

  /**
   * Deletes a bank and its associated transactions.
   * @param {number} bankId - The ID of the bank to delete.
   */
  deleteBank(bankId) {
    if (confirm("Tem certeza que deseja excluir este banco e todas as suas transações?")) {
      this.banks = this.banks.filter((b) => b.id !== bankId)
      this.transactions = this.transactions.filter((t) => t.bankId !== bankId) // Also remove associated transactions
      this.saveUserData()
      this.updateUI()
    }
  }

  /**
   * Handles the submission of the new transaction form.
   */
  handleTransactionSubmit() {
    const description = document.getElementById("description").value.trim()
    const amount = Number.parseFloat(document.getElementById("amount").value)
    const type = document.querySelector('input[name="type"]:checked').value
    const category = document.getElementById("category").value
    const bankId = document.getElementById("bank-select").value // It's a string, convert to number or null
    const date = document.getElementById("date").value

    if (!description || isNaN(amount) || amount <= 0 || !category || !date) {
      alert("Por favor, preencha todos os campos da transação corretamente.")
      return
    }

    const transaction = {
      id: Date.now(), // Unique ID for the transaction
      description,
      amount,
      type,
      category,
      bankId: bankId ? Number.parseInt(bankId) : null, // Convert to number or keep null
      date,
      createdAt: new Date().toISOString(),
    }

    this.transactions.push(transaction)
    this.saveUserData()
    this.resetTransactionForm()
    this.updateUI()
  }

  /**
   * Shows the delete confirmation modal for a transaction.
   * @param {number} transactionId - The ID of the transaction to delete.
   */
  deleteTransaction(transactionId) {
    this.transactionToDelete = transactionId
    document.getElementById("delete-modal").classList.remove("hidden")
  }

  /**
   * Confirms and performs the deletion of a transaction.
   */
  confirmDelete() {
    if (this.transactionToDelete) {
      this.transactions = this.transactions.filter((t) => t.id !== this.transactionToDelete)
      this.saveUserData()
      this.updateUI()
      this.hideDeleteModal()
    }
  }

  /**
   * Hides the delete confirmation modal.
   */
  hideDeleteModal() {
    document.getElementById("delete-modal").classList.add("hidden")
    this.transactionToDelete = null
  }

  /**
   * Resets the transaction form fields to their default states.
   */
  resetTransactionForm() {
    document.getElementById("transaction-form").reset()
    this.setCurrentDate() // Set current date again
    document.querySelector('input[name="type"][value="receita"]').checked = true // Default to income
  }

  /**
   * Sets the date input field to the current date.
   */
  setCurrentDate() {
    document.getElementById("date").valueAsDate = new Date()
  }

  /**
   * Updates all dynamic parts of the user interface.
   */
  updateUI() {
    this.renderBanks()
    this.renderBankTabs()
    this.updateBankSelect()
    this.updateChartBankFilter()
    this.renderTransactions()
    this.updateSummary()
    this.updateChart()
  }

  /**
   * Renders the bank cards in the "Meus Bancos" section.
   */
  renderBanks() {
    const container = document.getElementById("banks-container")

    if (this.banks.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; padding: var(--spacing-2xl); text-align: center;">
          <i class="ri-bank-line" style="font-size: 3rem; color: var(--text-muted); margin-bottom: var(--spacing-md);"></i>
          <p style="color: var(--text-muted); font-size: 1rem; font-weight: 500; margin-bottom: var(--spacing-sm);">Nenhum banco cadastrado</p>
          <small style="color: var(--text-muted); font-size: 0.875rem;">Clique em "Adicionar Banco" para começar a gerenciar suas contas</small>
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
        <div class="bank-card" role="region" aria-label="Cartão do Banco ${bank.name}">
          <div class="bank-card-header">
            <h3 class="bank-name">🏦 ${bank.name}</h3>
            <div class="bank-actions">
              <button class="bank-action-btn" onclick="app.editBank(${bank.id})" title="Editar banco" aria-label="Editar banco ${bank.name}">
                <i class="ri-edit-line" aria-hidden="true"></i>
              </button>
              <button class="bank-action-btn" onclick="app.deleteBank(${bank.id})" title="Excluir banco" aria-label="Excluir banco ${bank.name}">
                <i class="ri-delete-bin-line" aria-hidden="true"></i>
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

  /**
   * Renders the bank tabs for filtering transactions.
   */
  renderBankTabs() {
    const container = document.getElementById("bank-tabs")
    const allBanksLabel = "Todos os Bancos"
    const noBankLabel = "Dinheiro"

    let tabs = `
      <button class="bank-tab ${this.currentBankFilter === "all" ? "active" : ""}" 
              onclick="app.setCurrentBankFilter('all')" role="tab" aria-selected="${this.currentBankFilter === "all"}" tabindex="${this.currentBankFilter === "all" ? "0" : "-1"}">
          ${allBanksLabel}
      </button>
      <button class="bank-tab ${this.currentBankFilter === "none" ? "active" : ""}" 
              onclick="app.setCurrentBankFilter('none')" role="tab" aria-selected="${this.currentBankFilter === "none"}" tabindex="${this.currentBankFilter === "none" ? "0" : "-1"}">
          ${noBankLabel}
      </button>
    `

    tabs += this.banks
      .map(
        (bank) => `
      <button class="bank-tab ${this.currentBankFilter === bank.id.toString() ? "active" : ""}" 
              onclick="app.setCurrentBankFilter('${bank.id}')" role="tab" aria-selected="${this.currentBankFilter === bank.id.toString()}" tabindex="${this.currentBankFilter === bank.id.toString() ? "0" : "-1"}">
          ${bank.name}
      </button>
    `,
      )
      .join("")

    container.innerHTML = tabs
  }

  /**
   * Sets the current bank filter and updates the UI.
   * @param {string} filter - The filter value ('all', 'none' for no bank, or bank ID as string).
   */
  setCurrentBankFilter(filter) {
    this.currentBankFilter = filter
    this.updateUI()
  }

  /**
   * Populates the bank selection dropdown in the transaction form.
   */
  updateBankSelect() {
    const select = document.getElementById("bank-select")

    let options = '<option value="">💵 Dinheiro/Nenhum</option>'
    options += this.banks.map((bank) => `<option value="${bank.id}">${bank.name}</option>`).join("")

    select.innerHTML = options
  }

  /**
   * Populates the bank filter dropdown for the chart.
   */
  updateChartBankFilter() {
    const select = document.getElementById("chart-bank-filter")

    let options = '<option value="all">Todos os Bancos</option>'
    options += this.banks.map((bank) => `<option value="${bank.id}">${bank.name}</option>`).join("")

    select.innerHTML = options
    select.value = this.currentBankFilter // Keep current selection
  }

  /**
   * Renders the list of transactions based on the current filters.
   */
  renderTransactions() {
    const list = document.getElementById("transactions-list")

    let filteredTransactions = [...this.transactions] // Create a shallow copy to sort

    // Apply bank filter
    if (this.currentBankFilter !== "all") {
      if (this.currentBankFilter === "none") {
        filteredTransactions = filteredTransactions.filter((t) => !t.bankId)
      } else {
        const bankId = Number.parseInt(this.currentBankFilter)
        filteredTransactions = filteredTransactions.filter((t) => t.bankId === bankId)
      }
    }

    if (filteredTransactions.length === 0) {
      const filterText =
        this.currentBankFilter === "all"
          ? "nenhuma transação registrada"
          : this.currentBankFilter === "none"
            ? "nenhuma transação em dinheiro"
            : `nenhuma transação para ${this.banks.find((b) => b.id === Number.parseInt(this.currentBankFilter))?.name || "este banco"}`

      list.innerHTML = `
        <li class="no-transactions">
          <div class="empty-state">
            <i class="ri-file-list-line"></i>
            <p>${filterText.charAt(0).toUpperCase() + filterText.slice(1)}</p>
            <small>Adicione uma nova transação acima</small>
          </div>
        </li>
      `
      return
    }

    // Sort by date (newest first)
    const sortedTransactions = [...filteredTransactions].sort((a, b) => new Date(b.date) - new Date(a.date))

    list.innerHTML = sortedTransactions
      .map((transaction) => {
        const bank = this.banks.find((b) => b.id === transaction.bankId)
        const bankName = bank ? `🏦 ${bank.name}` : "💵 Dinheiro"
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
                <span>${bankName}</span>
                <span>•</span>
                <span>${this.formatDate(transaction.date)}</span>
              </div>
            </div>
          </div>
          <div class="transaction-amount">
            <span class="amount-value ${amountClass}">
              ${amountPrefix}${this.formatCurrency(transaction.amount)}
            </span>
            <button class="delete-btn" onclick="app.deleteTransaction(${transaction.id})" title="Excluir transação">
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

    // Apply bank filter
    if (this.currentBankFilter !== "all") {
      if (this.currentBankFilter === "none") {
        filteredTransactions = filteredTransactions.filter((t) => !t.bankId)
      } else {
        const bankId = Number.parseInt(this.currentBankFilter)
        filteredTransactions = filteredTransactions.filter((t) => t.bankId === bankId)
      }
    }

    const totalIncome = filteredTransactions.filter((t) => t.type === "receita").reduce((sum, t) => sum + t.amount, 0)

    const totalExpense = filteredTransactions.filter((t) => t.type === "despesa").reduce((sum, t) => sum + t.amount, 0)

    const balance = totalIncome - totalExpense

    // Add initial balances if showing specific bank or all banks
    let initialBalance = 0
    if (this.currentBankFilter === "all") {
      initialBalance = this.banks.reduce((sum, bank) => sum + bank.initialBalance, 0)
    } else if (this.currentBankFilter !== "none") {
      const bank = this.banks.find((b) => b.id === Number.parseInt(this.currentBankFilter))
      if (bank) {
        initialBalance = bank.initialBalance
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

    // Apply bank filter
    if (bankFilter !== "all") {
      const bankId = Number.parseInt(bankFilter)
      filteredTransactions = filteredTransactions.filter((t) => t.bankId === bankId)
    }

    const chartDom = document.getElementById("chart")

    if (this.chart) {
      this.chart.dispose()
    }

    this.chart = this.echarts.init(chartDom, "dark")

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

    this.chart.setOption(option)

    // Handle resize
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

    const sortedCategories = Object.entries(categoryData)
      .sort(([, a], [, b]) => b - a)
      .reduce((acc, [key, value]) => {
        acc[key] = value
        return acc
      }, {})

    const categories = Object.keys(sortedCategories)
    const values = Object.values(sortedCategories)

    return {
      title: {
        text: "Despesas por Categoria",
        left: "center",
        textStyle: {
          color: "#f8fafc",
          fontSize: 16,
          fontWeight: 600,
        },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
        formatter: (params) => {
          return `${params[0].name}: ${this.formatCurrency(params[0].value)}`
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: "60px",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        axisLabel: {
          formatter: (value) => this.formatCurrency(value),
          color: "#cbd5e1",
        },
        axisLine: {
          lineStyle: {
            color: "#475569",
          },
        },
        splitLine: {
          lineStyle: {
            color: "#334155",
          },
        },
      },
      yAxis: {
        type: "category",
        data: categories.length > 0 ? categories : ["Sem dados"],
        axisLabel: {
          color: "#cbd5e1",
        },
        axisLine: {
          lineStyle: {
            color: "#475569",
          },
        },
      },
      series: [
        {
          name: "Despesas",
          type: "bar",
          data: values.length > 0 ? values : [0],
          itemStyle: {
            color: "#ef4444",
            borderRadius: [0, 4, 4, 0],
          },
          barWidth: "60%",
          label: {
            show: true,
            position: "right",
            formatter: (params) => this.formatCurrency(params.value),
            color: "#cbd5e1",
          },
        },
      ],
    }
  }

  getBankChartOption() {
    const bankData = this.banks.map((bank) => ({
      name: bank.name,
      value: this.calculateBankBalance(bank.id),
    }))

    // Add "Sem Banco" transactions
    const noBankTransactions = this.transactions.filter((t) => !t.bankId)
    const noBankIncome = noBankTransactions.filter((t) => t.type === "receita").reduce((sum, t) => sum + t.amount, 0)
    const noBankExpense = noBankTransactions.filter((t) => t.type === "despesa").reduce((sum, t) => sum + t.amount, 0)
    const noBankBalance = noBankIncome - noBankExpense

    if (noBankBalance !== 0) {
      bankData.push({
        name: "Dinheiro",
        value: noBankBalance,
      })
    }

    return {
      title: {
        text: "Saldo por Banco",
        left: "center",
        textStyle: {
          color: "#f8fafc",
          fontSize: 16,
          fontWeight: 600,
        },
      },
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          return `${params.name}: ${this.formatCurrency(params.value)}`
        },
      },
      series: [
        {
          name: "Saldo",
          type: "pie",
          radius: "70%",
          data: bankData,
          itemStyle: {
            borderRadius: 8,
            borderColor: "#1e293b",
            borderWidth: 2,
          },
          label: {
            formatter: "{b}: {c}",
            color: "#cbd5e1",
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
        },
      ],
    }
  }

  getTimelineChartOption(transactions) {
    // Group transactions by month
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
        text: "Evolução Financeira",
        left: "center",
        textStyle: {
          color: "#f8fafc",
          fontSize: 16,
          fontWeight: 600,
        },
      },
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          let result = `${params[0].axisValue}<br/>`
          params.forEach((param) => {
            result += `${param.seriesName}: ${this.formatCurrency(param.value)}<br/>`
          })
          return result
        },
      },
      legend: {
        data: ["Receitas", "Despesas", "Saldo"],
        textStyle: {
          color: "#cbd5e1",
        },
        top: 40,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: "80px",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: sortedMonths.map((month) => {
          const [year, monthNum] = month.split("-")
          return new Date(year, monthNum - 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
        }),
        axisLabel: {
          color: "#cbd5e1",
        },
        axisLine: {
          lineStyle: {
            color: "#475569",
          },
        },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          formatter: (value) => this.formatCurrency(value),
          color: "#cbd5e1",
        },
        axisLine: {
          lineStyle: {
            color: "#475569",
          },
        },
        splitLine: {
          lineStyle: {
            color: "#334155",
          },
        },
      },
      series: [
        {
          name: "Receitas",
          type: "line",
          data: incomeData,
          itemStyle: {
            color: "#10b981",
          },
          smooth: true,
        },
        {
          name: "Despesas",
          type: "line",
          data: expenseData,
          itemStyle: {
            color: "#ef4444",
          },
          smooth: true,
        },
        {
          name: "Saldo",
          type: "bar",
          data: balanceData,
          itemStyle: {
            color: "#ec4899",
          },
        },
      ],
    }
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
