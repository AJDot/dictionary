const port = 8080,
  http = require("http"),
  https = require("https"),
  fs = require('fs')

// For Oxford
var HOST_NAME = "od-api.oxforddictionaries.com"
var PATH_NAME = "/api/v1"
var APP_ID = "747b3864"
var APP_KEY = "62efe3c590b2f3d2e0602b61bdc0160f"

// For Merriam-Webster
const APP_KEY_MW = "cd53e4f0-4d42-45c3-85c5-446cd8719449"

//create a server object:
http
  .createServer(function (request, response) {
    const { url, headers } = request
    let body = []

    request
      .on("error", (err) => {
        console.error(err)
      })
      .on("data", (chunk) => {
        body.push(chunk)
      })
      .on("end", () => {
        body = Buffer.concat(body).toString()

        response.on("error", (err) => {
          console.log(err)
        })

        if (url.startsWith("/search")) {
          switch (headers.api) {
            case "POKE":
              searchPokemon(request, response)
              break
            case "MW":
              searchMerriamWebster(request, response)
              break
            case "OX":
              searchOxford(request, response)
              break
            default:
              break
          }
        } else {
          if (url === '/') {
            response.writeHead(200, { 'content-type': 'text/html' })
            fs.createReadStream(`./public/index.html`).pipe(response)
          } else if (/.css$/.test(url)) {
            response.writeHead(200, { 'content-type': 'text/css' })
            fs.createReadStream(`./public${url}`).pipe(response)
          } else if (/.js$/.test(url)) {
            response.writeHead(200, { 'content-type': 'text/javascript' })
            fs.createReadStream(`./public${url}`).pipe(response)
          } else {
            response.writeHead(204).end()
          }
        }
      })
      .resume()
  })
  .listen(port) //the server object listens on port 8080

function searchOxford(request, response) {
  const { url } = request

  const options = {
    hostname: HOST_NAME,
    port: 443,
    path: PATH_NAME + url,
    method: "GET",
    headers: {
      app_id: APP_ID,
      app_key: APP_KEY
    }
  }

  const req = https.request(options, (res) => {
    let dictBody = ""

    res.on("data", (chunk) => {
      dictBody += chunk
    })

    res.on("end", () => {
      response.statusCode = 200
      response.setHeader("Content-Type", "application/json")
      response.write(dictBody)
      response.end()
    })
  })

  req.on("error", (error) => {
    console.error(error)
  })

  req.end()
}

function searchMerriamWebster(request, response) {
  const { url } = request

  const word = url
    .split("&")
    .find((x) => x.startsWith("q="))
    .split("=")[1]

  const options = {
    hostname: "dictionaryapi.com",
    port: 443,
    path: `/api/v3/references/collegiate/json/${word}?key=${APP_KEY_MW}`,
    method: "GET"
  }

  const req = https.request(options, (res) => {
    let dictBody = ""

    res.on("data", (chunk) => {
      dictBody += chunk
    })

    res.on("end", () => {
      response.statusCode = 200
      response.setHeader("Content-Type", "application/json")
      response.write(dictBody)
      response.end()
    })
  })

  req.on("error", (error) => {
    console.error(error)
  })

  req.end()
}

function searchPokemon(request, response) {
  const { url } = request

  const pokemon = url
    .split("&")
    .find((x) => x.startsWith("q="))
    .split("=")[1]

  const options = {
    hostname: "pokeapi.co",
    port: 443,
    path: "/api/v2/pokemon/" + pokemon,
    method: "GET"
  }

  const req = https.request(options, (res) => {
    let dictBody = ""

    res.on("data", (chunk) => {
      dictBody += chunk
    })

    res.on("end", () => {
      response.statusCode = 200
      response.setHeader("Content-Type", "application/json")
      response.write(dictBody)
      response.end()
    })
  })

  req.on("error", (error) => {
    console.error(error)
  })

  req.end()
}
