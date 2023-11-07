const api = "https://api.exchangerate-api.com/v4/latest/USD";
const dbrepo = "https://gist.githubusercontent.com/ksafranski/2973986/raw/5fda5e87189b066e11c1bf80bbfbecb556cf2cc1/Common-Currency.json";

let amount = document.getElementById("inputAmount");
let fromC = document.getElementById("fromCurrency");
let toC = document.getElementById("toCurrency");
let favBtn = document.getElementById("favourite")
let output = document.getElementById("outputAmount");
let box = document.getElementById("activityBox");
var tab = 0;

let winurl = String(window.location).split('?');
var params = {};

// api, main and input functions
var res;
var db;

async function jsonfetch(url) {
  if (window.navigator.onLine) {
    var raw;
    try {
      raw = await fetch(url);
    } catch (e) {
      return false;
    }
    return raw.json();
  }
  else return false;
}

async function recall() {
  if (Date.now() - (res ? res.time_last_updated : 0) > 60000) {
    let getres = await jsonfetch(api);
    if (getres) res = getres;
    else return false;
  }
}

async function main() {
  // fetch from api
  res = await jsonfetch(api);
  if (res) localStorage.apires = JSON.stringify(res);
  if (!res && localStorage.apires) res = JSON.parse(localStorage.apires);
  db = await jsonfetch(dbrepo, false);
  if (db) db.INR.symbol_native = '₹';
  else db = {};
  
  // select2 options
  let currencies = (res ? Object.keys(res.rates) : []);
  removeArrayElement(currencies, 'INR');
  removeArrayElement(currencies, 'USD');
  fromC.innerHTML = updatedOptions(currencies);
  toC.innerHTML = updatedOptions(currencies);
  
  // other components
  if (winurl[1]) {
      winurl[1].split('&').forEach(function(pair) {
        let p = pair.split('=');
        if (p.length == 1) p.push(null);
        params[p[0]] = p[1];
      });
  }
  if (!params.from) params.from = 'USD';
  if (!params.to) params.to = 'INR';
  if (!params.amount) params.amount = amount.value;
  $('#fromCurrency').val(params.from).trigger('change');
  $('#toCurrency').val(params.to).trigger('change');
  $('#inputAmount').val(params.amount).trigger('change');
  document.getElementById("switchselect").innerHTML = symbols.swap;
}

function swapCurrencies() {
  let temp = fromC.value;
  $('#fromCurrency').val(toC.value).trigger('change');
  $('#toCurrency').val(temp).trigger('change');
}

async function conversion() {
  await recall();
  let from = res.rates[fromC.value];
  let to = res.rates[toC.value];
  let amt = amount.value;
  var convertedAmount = ((to / from) * amt).toFixed(2);
  let to_data = db[toC.value];
  let symbol = to_data.symbol_native || '';
  output.innerHTML = '<center><h3>' + symbol + ' ' + convertedAmount + '</h3></center>';
  
  let hist = localStorage.history || '';
  let parsed = fromC.value + ',' + toC.value + ';';
  hist = parsed + hist.replace(parsed, '');
  localStorage.history = hist;
  if (tab == 1) showHistory();
  
  window.history.pushState({}, document.title, linkExchange(fromC.value, toC.value, amount.value));
}

function favouriteExchange() {
  let favs = localStorage.favourites || '';
  let parsed = fromC.value + ',' + toC.value + ';';
  if (!favs.includes(parsed)) {
    favs = favs + parsed;
  }
  favBtn.innerHTML = symbols.starred;
  localStorage.favourites = favs;
  if (tab == 2) showFavourites()
}

function resetFavourite() {
  favBtn.innerHTML = symbols.hollowstar;
}

function showFavourites() {
  let favs = localStorage.favourites;
  if (!favs) return;
  let favarray = favs.split(';').slice(0, -1).map((f) => f.split(','));
  let HTML = "";
  favarray.forEach(function (a) {
    HTML += linkExchangeHTML(a);
  });
  box.innerHTML = HTML;
  tab = 2;
}

function showHistory() {
  let hist = localStorage.history;
  if (!hist) return;
  let hisarray = hist.split(';').slice(0, -1).map((f) => f.split(','));
  let HTML = "";
  hisarray.forEach(function (a) {
    HTML += linkExchangeHTML(a);
  });
  box.innerHTML = HTML;
  tab = 1;
}

// utility functions
function removeArrayElement(array, key) {
  array.splice(array.indexOf(key), 1);
}

function linkExchange(from, to, amt) {
  return winurl[0] + "?from=" + from + "&to=" + to + "&amount=" + amt;
}

function linkExchangeHTML(array) {
  return "<a href=\"" + linkExchange(array[0], array[1], '1') + "\">" + array[0] + " " + symbols.rightarrow + " " + array[1] + "</a><br>";
}

function updatedOptions(array, selected) {
  let options = array.map(function(curr) {
    var data = db[curr];
    let option = curr;
    if (data) option += ' - ' + data.name;
    return `<option value=${curr}>${option}</option>`;
  });
  let usd = 'USD' + (db ? ' - ' + db['USD'].name : '');
  let inr = 'INR' + (db ? ' - ' + db['INR'].name : '');
  let HTML = `<optgroup><option value="INR">${inr}</option><option value="USD">${usd}</option>${options.join('')}</optgroup>`;
  return HTML;
}

// begin
main();

$(function () {
  $("select").select2();
});

const symbols = {
  hollowstar: '☆',
  starred: '★',
  rightarrow: "→",
  swap: "⇆"
}