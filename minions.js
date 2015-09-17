var library = require("nrtv-library")(require)


module.exports = library.export(
  "minions",
  ["nrtv-element", "nrtv-browser-bridge", "nrtv-server", "nrtv-socket"],
  function(element, BrowserBridge, Server, Socket) {

    function MinionQueue() {
      var tasks = this.tasks = {}

      var commands = new Socket("commands")

      var callbacks = new Socket("callbacks")

      callbacks.subscribe(
        function(data) {
          console.log("a minion said", JSON.stringify(data), "!")
        }
      )

      var iframe = element("iframe.sansa")

      var notifyServerWeAreDone = callbacks.definePublishOnClient()

      var runCommand = BrowserBridge.defineOnClient(
        [notifyServerWeAreDone],
        function(command) {

          document.querySelector(command.target).click()

          notify({
            commandId: command.id
          })

        }
      )

      callbacks.subscribe(
        function(data) {
          console.log(data.id, "finished")
        }
      )

      var subscribe = commands.defineSubscribeOnClient()

      var b = subscribe.withArgs(runCommand)

      BrowserBridge.asap(b)

      Server.get("/",
        function(request, response) {
          BrowserBridge.sendPage([
            buildTaskButtons(), iframe
          ])(request, response)
        }
      )

      Server.post("/commands",
        function(request, response) {
        }
      )

      function buildTaskButtons() {
        var taskButtons = []
        for (name in tasks) {
          taskButtons.push(taskButton(tasks[name], name))
        }

        return taskButtons
      }

      function taskButton(func, name) {
        var binding = BrowserBridge.defineOnClient(func)

        var button = element(
          "button",
          {
            onclick: run.withArgs(binding).evalable()
          },
          element.raw(name)
        )

        return button
      }

      var publish = callbacks.definePublishOnClient()

      var run = BrowserBridge.defineOnClient(
        [publish],
        function run(publish, func) {
          var iframe = document.querySelector(".sansa")

          var minion = {
            browse: function(url) {
              iframe.src = url
            },
            report: function(data) {
              publish(data)
            }
          }      

          func(minion, iframe)
        }
      )
    }

    MinionQueue.prototype.addTask =
      function(name, func) {
        this.tasks[name] = func
      }

    return MinionQueue
  }
)