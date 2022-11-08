const serverUrl = 'http://localhost:5000/api';
const storageKey = "savedAccount";

let state = Object.freeze({
  account: null,
});

const routes = {
  "/login": { tid: "login" },
  "/dashboard": { tid: "dashboard", init: refresh },
  "/credits": { tid: "credits" },
};

function navigate(path) {
  window.history.pushState({}, path, window.location.origin + path);
  updateRoute();
}

function updateRoute() {
  const path = window.location.pathname;
  const route = routes[path];

  if (!route) {
    return navigate("/dashboard");
  }

  const template = document.getElementById(route.tid);
  const view = template.content.cloneNode(true);
  const app = document.getElementById("app");
  app.innerHTML = "";
  app.appendChild(view);

  if (typeof route.init === "function") {
    route.init();
  }
}


function onLinkClick(event) {
  event.preventDefault();
  window.location = event.target.href;
  navigate(event.target.href);
}

function updateElement(id, textOrNode) {
  const element = document.getElementById(id);
  element.textContent = " "; // Removes all children
  element.append(textOrNode);
}

async function register() {
  
  const registerForm = document.getElementById("register-form");
  const formData = new FormData(registerForm);
  const data = Object.fromEntries(formData);

  const jsonData = JSON.stringify(data);

  const result = await createAccount(jsonData);

  if (result.error) {
    //return console.log('An error occurred:', result.error);
    return updateElement("register-error", result.error);
  }

  //console.log("Congratulations! Account created successfully.", result);
  updateState("account", result);
  navigate("/dashboard");
}

async function login() {
  const loginForm = document.getElementById("login-form");
  const user = loginForm.user.value;

  const data = await getAccount(user);

  if (data.error) {
    return updateElement("login-error", data.error);
  }

  updateState("account", data);
  navigate("/dashboard");
}

//sending account data using form (register)
async function createAccount(account) {
  try {
    const response = await fetch("//localhost:5000/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: account,
    });
    return await response.json();
  } catch (error) {
    return { error: error.message || "Unknown error" };
  }
}

//retrieving account data (login)
async function getAccount(user) {
  try {
    const response = await fetch(
      "//localhost:5000/api/accounts/" + encodeURIComponent(user)
    );
    return await response.json();
  } catch (error) {
    return { error: error.message || "Unknown error" };
  }
}


async function createTransaction(user, transaction) {
  
  try {
    const response = await fetch(
      '//localhost:5000/api/accounts/' + user +'/transactions' , {
      method: 'POST',
      headers:  { 'content-type': 'application/json' },
      body: transaction,
    });
    return await response.json();
  } catch (error) {
    return { error: error.message || 'Unknown error' };
  }

}

function createTransactionRow(transaction) {
  const template = document.getElementById("transaction");
  const transactionRow = template.content.cloneNode(true);
  const tr = transactionRow.querySelector("tr");
  tr.children[0].textContent = transaction.date;
  tr.children[1].textContent = transaction.object;
  tr.children[2].textContent = transaction.amount.toFixed(2);
  return transactionRow;
}

function updateDashboard() {
  const account = state.account;
  if (!account) {
    return logout();
  }

  updateElement("description", account.description);
  updateElement("balance", account.balance.toFixed(2));
  updateElement("currency", account.currency);

  const transactionsRows = document.createDocumentFragment();
  for (const transaction of account.transactions) {
    const transactionRow = createTransactionRow(transaction);
    transactionsRows.appendChild(transactionRow);
  }
  updateElement("transactions", transactionsRows);
}

function updateState(property, newData) {
  state = Object.freeze({
    ...state,
    [property]: newData,
  });
  //console.log(state);

  localStorage.setItem(storageKey, JSON.stringify(state.account));
}

async function updateAccountData() {
  const account = state.account;
  if (!account) {
    return logout();
  }

  const data = await getAccount(account.user);
  if (data.error) {
    return logout();
  }

  updateState("account", data);
}

async function refresh() {
  await updateAccountData();
  updateDashboard();
}

function logout() {
  updateState("account", null);
  navigate("/login");
}

function addTransaction() {
  const dialog = document.getElementById("transactionDialog");
  dialog.classList.add("show");
  dialog.classList.remove("noshow");

  // Reset form
  const transactionForm = document.getElementById("transaction-form");
  transactionForm.reset();

  // Set date to today
  transactionForm.date.valueAsDate = new Date();
}

async function confirmTransaction() {
  const dialog = document.getElementById("transactionDialog");
  dialog.classList.remove("show");

  const transactionForm = document.getElementById("transaction-form");

  const formData = new FormData(transactionForm);
  const jsonData = JSON.stringify(Object.fromEntries(formData));
  const data = await createTransaction(state.account.user, jsonData);

  if (data.error) {
    return updateElement("transactionError", data.error);
  }

  // Update local state with new transaction
  const newAccount = {
    ...state.account,
    balance: state.account.balance + data.amount,
    transactions: [...state.account.transactions, data],
  };
  updateState("account", newAccount);

  // Update display
  updateDashboard();
}

async function cancelTransaction() {
  const dialog = document.getElementById("transactionDialog");
  dialog.classList.add("noshow");
}

//initialization code
function init() {
  const savedAccount = localStorage.getItem(storageKey);
  if (savedAccount) {
    updateState("account", JSON.parse(savedAccount));
  }

  window.onpopstate = () => updateRoute();
  updateRoute();
}

init();

