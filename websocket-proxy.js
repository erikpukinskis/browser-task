var library = require("nrtv-library")(require)

module.exports = library.export(
  "websocket-proxy",
  ["get-socket", "url"],
  function(getSocket, url) {

    function proxySocket(clientSocket, host) {

      var destinationIsOpen = false
      var clientIsClosed = false
      var destinationIsClosed = false
      var waitingFromClient = []
      var path = url.parse(clientSocket.url).path
      var destinationUrl = "ws://"+host+path

      getSocket(destinationUrl, function(destinationSocket) {

        clientSocket.listen(
          function(message) {
            if (destinationIsOpen) {
              sendToProxy(message)
            } else {
              waitingFromClient.push(message)
            }
          }
        )

        clientSocket.onClose(
          function() {
            clientIsClosed = true
            destinationSocket.close()
          }
        )

        destinationSocket.onClose(function() {
          destinationIsClosed = true
        })

        destinationSocket.listen(
          function(message) {
            if (clientIsClosed) {
              throw new Error("Websocket proxy destination "+hostUrl+" sent message \""+message+"\" but the client socket already closed.")
            }

            clientSocket.send(message)
          }
        )

        sendWaiting()

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

          destinationSocket.send(message, callback)
        }

      })

    }

    return proxySocket
  }
)
