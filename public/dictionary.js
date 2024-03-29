var PROXY = "";
var BASE_URL = "";
var DEFINITIONS_URL = "entries/en/";
var LIMIT = 25;
const API = "MW"; // "OX" | "MW" | "POKE"

function Dictionary(input, url) {
  this.input = input;
  this.url = url;

  this.listUI = null;
  this.overlay = null;

  this.wrapInput();
  this.createUI();
  this.valueChanged = debounce(this.valueChanged.bind(this), 300);
  this.bindEvents();

  this.reset();
}

Dictionary.prototype.wrapInput = function () {
  var wrapper = document.createElement("div");
  wrapper.classList.add("autocomplete-wrapper");
  this.input.parentNode.appendChild(wrapper);
  wrapper.appendChild(this.input);
};

Dictionary.prototype.createUI = function () {
  var defsUI = document.createElement("div");
  defsUI.classList.add("autocomplete-defs");
  this.input.parentNode.appendChild(defsUI);
  this.defsUI = defsUI;

  var listUI = document.createElement("ul");
  listUI.classList.add("autocomplete-ul");
  this.input.parentNode.appendChild(listUI);
  this.listUI = listUI;
};

Dictionary.prototype.bindEvents = function () {
  this.input.addEventListener("input", this.valueChanged.bind(this));
  document.addEventListener("keydown", this.handleKeydown.bind(this));
  this.listUI.addEventListener("click", this.handleClickItem.bind(this));
};

Dictionary.prototype.valueChanged = function () {
  var value = this.input.value;

  if (value.length > 0) {
    this.fetchMatches(
      value,
      function (response) {
        // this.matches = response.results;
        this.matches = getMatches(response);
        this.selectedIndex = null;
        this.buildList();
      }.bind(this),
      {
        onError: function (response) {
          console.log("onError");
          console.log(response);
        }
      }
    );
  } else {
    this.reset();
  }
};

Dictionary.prototype.setupRequest = function (query, path, limit) {
  var request = new XMLHttpRequest();
  var url = PROXY + BASE_URL + path + encodeURIComponent(query);
  if (limit) {
    url = url + "&limit=" + LIMIT;
  }
  request.open("GET", url);
  request.responseType = "json";
  request.setRequestHeader("api", API);

  return request;
};

Dictionary.prototype.fetchMatches = function (
  query,
  callback,
  { onError } = {}
) {
  var request = this.setupRequest(query, this.url, LIMIT);

  request.addEventListener(
    "load",
    function () {
      callback(request.response);
    }.bind(this)
  );

  request.addEventListener(
    "loadstart",
    function () {
      this.loading(this.listUI);
    }.bind(this)
  );

  if (onError) {
    request.addEventListener("error", onError.bind(this));
  }

  request.send();
};

Dictionary.prototype.fetchDefinition = function (query, callback) {
  var request = this.setupRequest(query, DEFINITIONS_URL);

  request.addEventListener(
    "load",
    function () {
      callback(request.response);
    }.bind(this)
  );

  request.addEventListener(
    "loadstart",
    function () {
      this.loading(this.defsUI);
    }.bind(this)
  );

  request.send();
};

Dictionary.prototype.buildList = function () {
  this.clearElement(this.listUI);

  this.matches.forEach(
    function (match, index) {
      var li = document.createElement("li");
      li.classList.add("autocomplete-ui-choice");

      li.textContent = getListItemText(match);
      this.listUI.appendChild(li);
    }.bind(this)
  );
};

Dictionary.prototype.reset = function () {
  this.clearElement(this.listUI);
  this.clearElement(this.defsUI);
  this.selectedIndex = null;
};

Dictionary.prototype.clearElement = function (element) {
  var child;
  while ((child = element.lastChild)) {
    element.removeChild(child);
  }
};

Dictionary.prototype.handleKeydown = function (e) {
  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      this.selectDown();
      break;
    case "ArrowUp":
      e.preventDefault();
      this.selectUp();
      break;
    case "Enter":
      e.preventDefault();
      this.viewDefinition();
      break;
  }
};

Dictionary.prototype.selectDown = function () {
  if (this.selectedIndex === null) {
    this.selectedIndex = -1;
  }
  this.select(this.selectedIndex + 1);
};

Dictionary.prototype.selectUp = function () {
  if (this.selectedIndex === null) {
    this.selectedIndex = this.matches.length;
  }
  this.select(this.selectedIndex - 1);
};

Dictionary.prototype.viewDefinition = function () {
  this.selected = document.querySelector(".autocomplete-ui-choice.selected");
  if (this.selected) {
    this.input.dispatchEvent(new Event("input"));

    var query = this.selected.textContent;
    fetchDefinition(this, query);
  }
};

Dictionary.prototype.handleClickItem = function (e) {
  e.preventDefault();
  var target = e.target;
  if (target.tagName === "LI") {
    var itemsArray = [].slice.call(this.listUI.children);
    this.select(itemsArray.indexOf(target));

    var event = new KeyboardEvent("keydown", {
      target: document,
      key: "Enter"
    });

    document.dispatchEvent(event);
  }
};

Dictionary.prototype.select = function (newIndex) {
  var items = [].slice.call(this.listUI.children);

  this.selectedIndex = wrapNumber(newIndex, this.matches.length);

  items.forEach(
    function (item, itemIndex) {
      if (itemIndex === this.selectedIndex) {
        item.classList.add("selected");
      } else {
        item.classList.remove("selected");
      }
    }.bind(this)
  );
};

Dictionary.prototype.buildDefinitions = function (response) {
  this.input.value = this.selected.textContent;
  this.clearElement(this.defsUI);
  if (response) {
    this.definitions = response.results[0];

    this.buildDefHeading();
    this.buildDefPronunciation();
    this.buildDefLexicalEntries();
  } else {
    var h2 = document.createElement("h2");
    h2.textContent = "Oops!";
    this.defsUI.appendChild(h2);

    var p = document.createElement("p");
    p.innerHTML =
      "Something went wrong! </br> Please try again later or choose another word.";
    this.defsUI.appendChild(p);
  }
};

Dictionary.prototype.buildDefHeading = function () {
  var word = this.definitions.word;
  var h2 = document.createElement("h2");
  h2.textContent = word;
  this.defsUI.appendChild(h2);
};

Dictionary.prototype.buildDefPronunciation = function () {
  if (!this.definitions.lexicalEntries[0]) return;

  var pronunciations = this.definitions.lexicalEntries[0].pronunciations;
  if (pronunciations) {
    var p = document.createElement("p");
    p.textContent = "Pronunciation: ";
    var phoneticSpelling = pronunciations[0].phoneticSpelling;
    var span = document.createElement("span");
    span.classList.add("pronunciation");
    span.textContent = phoneticSpelling;
    p.appendChild(span);

    var file = pronunciations[0].audioFile;
    var audio = document.createElement("audio");
    audio.setAttribute("controls", "");
    var source = document.createElement("source");
    source.setAttribute("src", file);
    source.setAttribute("type", "audio/mpeg");
    audio.appendChild(source);
    p.appendChild(audio);

    this.defsUI.appendChild(p);
  }
};

Dictionary.prototype.buildDefLexicalEntries = function () {
  this.definitions.lexicalEntries.forEach(
    function (lexicalEntry) {
      var lexicalCategory = lexicalEntry.lexicalCategory;
      var h4 = document.createElement("h4");
      h4.textContent = lexicalCategory;
      this.defsUI.appendChild(h4);

      var entries = lexicalEntry.entries;
      this.buildDefSenses(entries);
    }.bind(this)
  );
};

Dictionary.prototype.buildDefSenses = function (entries) {
  var ol = document.createElement("ol");
  var senses = entries[0].senses;
  senses.forEach(
    function (sense) {
      var definitions = sense.definitions;
      if (definitions) {
        var definition = definitions[0];

        var li = document.createElement("li");
        var dl = document.createElement("dl");
        var dt = document.createElement("dt");
        dt.textContent = definition;
        dl.appendChild(dt);

        var examples = sense.examples;
        if (examples) {
          var dd = document.createElement("dd");
          dd.classList.add("example");
          dd.textContent = examples[0].text;
          dl.appendChild(dd);
        }
        li.appendChild(dl);
        ol.appendChild(li);

        this.defsUI.appendChild(ol);
      }
    }.bind(this)
  );
};

Dictionary.prototype.loading = function (element) {
  var loading = document.createElement("div");
  loading.className = "loading";
  this.clearElement(element);
  element.appendChild(loading);
};

function wrapNumber(number, end) {
  // 0 to end (exclusive)
  var number;
  number = number % end;

  if (number < 0) {
    number = end + number;
  }
  return number;
}

function debounce(func, delay) {
  var timeout;

  return function () {
    var args = arguments;
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(function () {
      func.apply(null, args);
    }, delay);
  };
}

function getMatches(response) {
  switch (API) {
    case "OX":
      return response.results;
    case "MW":
      return response;
    case "POKE":
      return response.abilities;
    default:
      throw new Error(`API not recognized: ${API}`);
  }
}

function getListItemText(entry) {
  switch (API) {
    case "OX":
      return entry.word;
    case "MW":
      return typeof entry === "string" ? entry : entry.meta.id;
    case "POKE":
      return entry.ability.name;
    default:
      throw new Error(`API not recognized: ${API}`);
  }
}

function fetchDefinition(context, query) {
  switch (API) {
    case "OX":
      context.fetchDefinition(query, context.buildDefinitions.bind(context));
      break;
    case "MW":
      const match = context.matches.find(
        (entry) => typeof entry !== "string" && entry.meta.id === query
      );
      if (match) {
        let subdirectory;
        const pr = match.hwi.prs && match.hwi.prs[0];
        let prs;
        if (pr) {
          if (pr.sound.audio.startsWith("bix")) {
            subdirectory = "bix";
          } else if (pr.sound.audio.startsWith("gg")) {
            subdirectory = "gg";
          } else if (
            pr.sound.audio.match(/^[0-9]/) &&
            !pr.sound.audio.match(/^[a-zA-Z]/)
          ) {
            subdirectory = "number";
          } else {
            subdirectory = pr.sound.audio[0];
          }
          prs = [
            {
              phoneticSpelling: pr.mw,
              audioFile: `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdirectory}/${pr.sound.audio}.mp3`
            }
          ];
        }

        context.buildDefinitions({
          results: [
            {
              word: query,
              lexicalEntries: [
                {
                  pronunciations: prs,
                  lexicalCategory: match.fl,
                  entries: [
                    {
                      senses: match.shortdef.map((def) => {
                        return {
                          definitions: [def]
                        };
                      })
                    }
                  ]
                }
              ]
            }
          ]
        });
      } else {
        context.input.value = query;
        context.valueChanged();
      }
      break;
    case "POKE":
    default:
      throw new Error(`API not recognized: ${API}`);
  }
}
