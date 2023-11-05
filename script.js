const api = "https://api.exchangerate-api.com/v4/latest/USD";
const dbrepo = "https://gist.githubusercontent.com/ksafranski/2973986/raw/5fda5e87189b066e11c1bf80bbfbecb556cf2cc1/Common-Currency.json";
const db = jsonfetch(dbrepo); // ksafranski/Common-Currency.json

let amount = document.getElementById("inputAmount");
let fromC = document.getElementById("fromCurrency");
let toC = document.getElementById("toCurrency");
let output = document.getElementById("outputAmount");

// if (!localStorage.history) localStorage.history = ';';
// if (!localStorage.favourites) localStorage.favourites = 'USD,INR;';

// api and main code
var res;

async function jsonfetch(url) {
  let raw = await fetch(url);
  return raw.json();
}

async function recall() {
  if (Date.now() - (res ? res.time_last_updated : 0) > 60000) res = await jsonfetch(api);
}

async function main() {
  res = await jsonfetch(api);
  let currencies = (res ? Object.keys(res.rates) : []);
  removeArrayElement(currencies, 'INR');
  removeArrayElement(currencies, 'USD');
  fromC.innerHTML = updatedOptions(currencies);
  toC.innerHTML = updatedOptions(currencies);
  $('#fromCurrency').val('USD').trigger('change');
  $('#toCurrency').val('INR').trigger('change');
}

async function conversion() {
  await recall();
  let from = res.rates[selectedOption(fromC)];
  let to = res.rates[selectedOption(toC)];
  let amt = amount.value;
  var convertedAmount = ((to / from) * amt).toFixed(2);
  output.innerHTML = '<center><h3>' + convertedAmount + '</h3></center>';
}

async function swapCurrencies() {
  let from = selectedOption(fromC);
  let to = selectedOption(toC);
}

// functions
function removeArrayElement(array, key) {
  array.splice(array.indexOf(key), 1);
}

function selectedOption(menu) {
  return menu.options[menu.selectedIndex].text;
}

function updatedOptions(array, selected) {
  let options = array.map(function(curr) {
    var data = db[curr];
    return `<option value=${curr}>${curr}</option>`;
  });
  let HTML = `<optgroup><option value="INR">INR</option><option value="USD">USD</option>${options.join('')}</optgroup>`;
  return HTML;
}

// call some functions
main();

$(function () {
  $("select").select2();
});