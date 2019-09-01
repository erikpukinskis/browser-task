var library = require("module-library")(require)

// rename workspace?

module.exports = library.export(
  "controllable-iframe",
  [
    "single-use-socket",
    "web-element",
    "global-wait"
  ],
  function(SingleUseSocket, element, wait) {

    function buildControllableIframe(site, bridge, requestWork, id) {

      var socket = new SingleUseSocket(site)

      var _this = this


      // Requesting work

      socket.listen(
        function(response) {
          if (response != "undefined") {
            var object = JSON.parse(response)

            var report = object.__nrtvMinionMessage || object

            var isWorkRequest = object.__nrtvWorkRequest
          }

          if (isWorkRequest) {
            requestWork(sendAJob, id)
          } else {
            socket.assignedTask.callback(report)
          }
        }
      )

      bridge.asap(
        bridge.defineFunction(
          function markMyself(id) {
            document.isOutsideNrtvMinionIframe = true
            document.cookie = "nrtvMinionId="+id
          }
        ).withArgs(id)
      )

      var workRequest = JSON.stringify({__nrtvWorkRequest: "can i haz work?"})

      bridge.asap(socket.defineSendOn(bridge).withArgs(workRequest))

      bridge.asap([
        socket.defineCloseHandlerOn(bridge)],
        function(onClose) {
          onClose(function() {
            document.querySelector(".blinkenlicht").classList.remove("on")
            document.querySelector(".screen").classList.add("off")
          })
        })


      // Sending work

      function sendAJob(task) {
        console.log("\n______\nMINION on "+socket.identifier+" is getting work:\n")

        if (!task.funcSource) {
          task.funcSource = task.func.toString()
        }

        var message = JSON.stringify({
          source: task.funcSource,
          args: task.args || []
        })

        socket.send(message)

        socket.assignedTask = task
      }

      bridge.domReady(
        function() {
          var doc = document.querySelector("iframe.sansa").contentWindow.document
          doc.open()
          doc.write("<html><body>Ready for work.</body></html")
          doc.close()
          document.querySelector(".blinkenlicht").classList.add("on")
        })

      bridge.addToHead(
        stylesheet)

      var doWork = bridge.defineFunction(
        [
          socket.defineSendOn(bridge),
          wait.defineOn(bridge)],
        function doWork(sendSocketMessage, wait, data) {

          task = JSON.parse(data)

          var iframe = document.querySelector(".sansa")

          function readyDocument(callback) {
            wait.forIframe(iframe, callback)
          }

          var minion = {
            browse: function(url, callback) {
              iframe.src = url
              iframe.onload = readyDocument.bind(null, callback)
            },
            report: function(object) {
              if (typeof object == "string") {
                var message = object
                object = {
                  __nrtvMinionMessage: message
                }
              }

              sendSocketMessage(JSON.stringify(object))
            },
            wait: wait
          }      

          var func = eval("f="+task.source)

          task.args.push(minion)
          task.args.push(iframe)

          func.apply(null, task.args)
        }
      )

      bridge.asap(
        socket
        .defineListenOn(bridge)
        .withArgs(doWork)
      )


      // Building the DOM struture

      return element(".box",
        element(".screen",
          element("iframe.sansa"),
          element(".blinkenlicht"),
          element(".logo", "BROWSER TASK 4000")))
    }

    var stylesheet = element.stylesheet([
      element.style(
        ".box",{
          "margin": "30px",
          "padding": "24px 23px 34px 23px",
          "border-radius": "6px",
          "background": "lightgray",
          "display": "inline-block",
        }),

      element.style(
        ".screen",{
          "background": "white",
          "position": "relative",
          "border-radius": "2px",

          ".off": {
            "background": "black",
          },
        }),

      element.style(
        ".blinkenlicht",{
        "position": "absolute",
        "bottom": "-18px",
        "left": "4px",
        "content": "\"\"",
        "width": "10px",
        "height": "4px",
        "background": "gray",
        "z-index": "1",

        ".on": {
          "background": "lawngreen",
          "box-shadow": "0 0 4px 3px #c3eaff",
        }
      }),

      element.style(
        ".logo",{
        "position": "absolute",
        "bottom": "-23px",
        "right": "0",
        "color": "#6f5e5e",
        "font-family": "Impact",
        "font-size": "11px",
        }),

      element.style(
        "iframe.sansa",{
        "border-width": "10px 8px 40px 8px",
        "vertical-align": "top",
        "border-radius": "2px",
        "z-index": "0",
      }),
    ])

    return buildControllableIframe
  }
)