var test = require("nrtv-test")(require)
var library = test.library

// test.only("controlling minions through the API")
test.only("a minion presses a button and reports back what happened")

test.library.define(
  "button-server",
  ["nrtv-element", "nrtv-browser-bridge", "nrtv-element-server"],
  function(element, bridge, server) {

    var ahey = bridge.defineFunction(
      function() {
        document.querySelector("body").innerHTML = "a hey ahoy!"
      }
    )
    var butt = element(
      "button.hai",
      {onclick: ahey.evalable()},
      "O hai"
    )

    server.serve(butt)

    return server
  }
)

test.using(
  "a minion presses a button and reports back what happened",
  ["./minions", "button-server", "nrtv-dispatcher"],
  function(expect, done, minions, buttonServer, Dispatcher) {

    var queue = new Dispatcher()

    minions.server.start(8888, queue)

    queue.addTask(
      function doSomeFunStuff(testVariable, minion, iframe) {
        if (testVariable != "hi") {
          throw new Error("Minion didn't get data!")
        }

        minion.browse("/", function() {
          minion.press(".hai")
          minion.report(iframe.contentDocument.querySelector("body").innerHTML)          
        })
      },
      function report(message) {
        expect(message).to.equal("a hey ahoy!")
        done()
        buttonServer.stop()
      },
      ["hi"]
    )

    minions.halp(done)
  }
)

test.using(
  "controlling minions through the API",
  ["./minions", ],
  function(expect, done, minions) {

    var appServer

    library.using(
      ["button-server", library.reset("nrtv-server")],
      function(bs, server) {
        bs.start(9100)
        appServer = server
      }
    )

    minions.server.start()

    minions.api.addTask(
      function(frameOfReference, minion, iframe) {
        minion.report("IT IS A VERY PRETTY DAY " + frameOfReference + "!")
      },
      ["for Fred"],
      function(message) {
        expect(message).to.equal("IT IS A VERY PRETTY DAY for Fred!")
        minions.server.stop()
        done()
        appServer.stop()
      }
    )

    minions.halp(done)
  }
)
