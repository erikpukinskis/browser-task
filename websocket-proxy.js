var library = require("nrtv-library")(require)

module.exports = library.export(
  "websocket-proxy",
  ["ws", "url"],
  function(WebSocket, url) {
    function proxyConnection(sockJsConnection, host) {

      var destinationIsOpen = false
      var clientIsClosed = false
      var destinationIsClosed = false
      var waitingFromClient = []
      var path = url.parse(sockJsConnection.url).path
      var destinationUrl = "ws://"+host+path

      var wsSocket = new WebSocket(destinationUrl)

      sockJsConnection.on("data",
        function(message) {
          if (destinationIsOpen) {
            sendToProxy(message)
          } else {
            waitingFromClient.push(message)
          }
        }
      )

      sockJsConnection.on("close",
        function() {
          clientIsClosed = true
          wsSocket.close()
        }
      )

      wsSocket.on("open", sendWaiting)

      wsSocket.on("close", function() {
        destinationIsClosed = true
      })

      wsSocket.on("message",
        function(message) {
          if (clientIsClosed) {
            throw new Error("Websocket proxy destination "+hostUrl+" sent message \""+message+"\" but the client socket already closed.")
          }

          sockJsConnection.write(message)
        }
      )

      function sendWaiting() {
        var message = waitingFromClient.shift()
        if (message) {
          sendToProxy(message, sendWaiting)
        } else {
          destinationIsOpen = true
        }
      }

      function sendToProxy(message, callback) {

        if (destinationIsClosed) {
          throw new Error("Client wanted to proxy message \""+message+"\" to "+hostUrl+" but the host socket was already closed.")
        }

        wsSocket.send(message, callback)
      }
    }

    return proxyConnection
  }
)
