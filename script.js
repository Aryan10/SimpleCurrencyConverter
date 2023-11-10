const api = "https://api.exchangerate-api.com/v4/latest/USD";
const trendsapi = (from, to, interval, outputsize) => `https://api.twelvedata.com/time_series?symbol=${from}/${to}&interval=${interval}&outputsize=${outputsize}&apikey=493a052a7b904dd08d6b48ec2d81a867`
const dbrepo = "https://gist.githubusercontent.com/ksafranski/2973986/raw/5fda5e87189b066e11c1bf80bbfbecb556cf2cc1/Common-Currency.json";

let amount = document.getElementById("inputAmount");
let fromC = document.getElementById("fromCurrency");
let toC = document.getElementById("toCurrency");
let favBtn = document.getElementById("favourite")
let output = document.getElementById("outputAmount");
let box = document.getElementById("activityBox");
let select_time_series = document.getElementById("time_series");
let canvas = document.getElementById('trendsDisplay');
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
  
  // other components and parameters
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
  if (!params.time_series) params.time_series = '1day-30';
  $('#fromCurrency').val(params.from).trigger('change');
  $('#toCurrency').val(params.to).trigger('change');
  $('#inputAmount').val(params.amount).trigger('change');
  $('#time_series').val(params.time_series).trigger('change');
  document.getElementById("switchselect").innerHTML = symbols.swap;
  $('#activityBox').hide();
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
  
  updateURL();
}

function favouriteExchange() {
  let favs = localStorage.favourites || '';
  let parsed = fromC.value + ',' + toC.value + ';';
  if (!favs.includes(parsed)) {
    favs = favs + parsed;
  }
  favBtn.innerHTML = symbols.starred;
  localStorage.favourites = favs;
  if (tab == 2) showFavourites();
}

function resetFavourite() {
  favBtn.innerHTML = symbols.hollowstar;
}

var deleteHTML = '<button type="button" id="deleteButton" onclick="deleteSelected()">&nbsp;🗑&nbsp;</button>';

function showFavourites(clicked) {
  if (tab == 2 && clicked) {
    $('#activityBox').hide();
    tab = 0;
    return;
  }
  $('#activityBox').show();
  let favs = localStorage.favourites;
  let favarray = favs.split(';').slice(0, -1).map((f) => f.split(','));
  let HTML = "";
  favarray.forEach(function (a) {
    HTML += linkExchangeHTML(a, 'f');
  });
  box.innerHTML = deleteHTML + HTML;
  tab = 2;
}

function showHistory(clicked) {
  if (tab == 1 && clicked) {
    $('#activityBox').hide();
    tab = 0;
    return;
  }
  $('#activityBox').show();
  let hist = localStorage.history;
  let hisarray = hist.split(';').slice(0, -1).map((f) => f.split(','));
  let HTML = "";
  hisarray.forEach(function (a) {
    HTML += linkExchangeHTML(a, 'h');
  });
  box.innerHTML = deleteHTML + HTML;
  tab = 1;
}

var checked = [];

function checkboxStateChange(cid) {
  let cbox = document.getElementById(cid);
  if (cbox.checked) checked.push(cid);
  else removeArrayElement(checked, cid);
  if (checked.length > 0) $('#deleteButton').show();
  else $('#deleteButton').hide();
}

function deleteSelected() {
  let stype = '';
  if (tab == 1) stype = 'history';
  else if (tab == 2) stype = 'favourites';
  else return;
  let storage = localStorage[stype];
  checked.forEach(c => {
    storage = storage.replace(c.slice(-6, -3) + ',' + c.slice(-3) + ';', '');
  });
  localStorage[stype] = storage;
  checked = [];
  tab == 1 ? showHistory() : showFavourites();
}

function onTrendsSelect() {
  params.time_series = select_time_series.value;
  updateURL();
  displayTrends();
}

async function displayTrends() {
  let {from, to} = params;
  let fromRate = res.rates[params.from];
  let toRate = res.rates[params.to];
  var convertedAmount = toRate / fromRate;
  if (convertedAmount < 1) {
    let temp = from;
    from = to;
    to = temp;
  }
  let val = params.time_series.split('-');
  // trends api
  let trendyurl = trendsapi(from, to, val[0], val[1]);
  let fetched = await fetch(trendyurl);
  let trend = await fetched.json();
  let labels = [], data = [];
  if (trend.status != 'ok') return;
  trend.values.forEach(d => {
    labels.push(labelDateParser(d.datetime, val[0].slice(1)));
    data.push(d.close);
  });

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `Exchange Rate: ${params.from} -> ${params.to}`,
        data,
        borderWidth: 1
      }]
    }
  });
}

// utility functions
function removeArrayElement(array, key) {
  array.splice(array.indexOf(key), 1);
}

function updateURL() {
  window.history.pushState({}, document.title, linkExchange());
}

function linkExchange() {
  let paramstr = [];
  Object.keys(params).forEach(function(id)  {
    paramstr.push(id + '=' + params[id]);
  });
  return winurl[0] + "?" + paramstr.join('&');
}

function linkExchangeHTML(array, idkey) {
  let id = idkey + 'checkbox' + array[0] + array[1];
  return `<input id="${id}" type="checkbox" onclick="checkboxStateChange('${id}')"><label for="checkbox${id} + array[0] + array[1]">&nbsp;&nbsp;<a href="${linkExchange(array[0], array[1], '1')}">${array[0] + " " + symbols.rightarrow + " " + array[1]}</a><br>`;
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

function labelDateParser(time, interval) {
  let date = new Date(time.replace(' ').replace(':'));
  switch(interval) {
    case "min":
    case "h":
      return date.getHours() + ':' + date.getMinutes();
    
    case "day":
    case "month":
      return date.getDate() + ' ' + months[date.getMonth()];
  }
  
}

// begin
main();

$(function () {
  $(".select2").select2();
});

const symbols = {
  hollowstar: '☆',
  starred: '★',
  rightarrow: "→",
  swap: "⇆"
}

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];