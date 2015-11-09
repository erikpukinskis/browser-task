var test = require("nrtv-test")(require)
var library = test.library

// test.only("controlling minions through the API")
// test.only("a minion presses a button and reports back what happened")
test.only("retaining minions and reporting objects")

test.library.define(
  "button-server",
  ["nrtv-element", "nrtv-browser-bridge", "nrtv-server"],
  function(element, bridge, Server) {

    function ButtonStuff() {
      this.server = new Server()

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

      this.server.get("/", bridge.sendPage(butt))

      this.start = this.server.start.bind(this.server)
      this.stop = this.server.stop.bind(this.server)
    }

    return ButtonStuff
  }
)

test.using(
  "a minion presses a button and reports back what happened",
  ["./minions", "button-server", "nrtv-dispatcher"],
  function(expect, done, minions, ButtonServer, Dispatcher) {

    var app = new ButtonServer()
    app.start(7777)

    var queue = new Dispatcher()

    minions.server.start(8888, queue)

    queue.addTask(
      {host: "http://localhost:7777"},
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
        app.stop()
        minions.server.stop()
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
        appServer = server
      }
    )

    minions.server.start(8888)

    var api = minions.api.at("http://localhost:8888")
    minions.api.addTask(
      function(frameOfReference, minion, iframe) {
        minion.report("IT IS A VERY PRETTY DAY " + frameOfReference + "!")
      },
      ["for Fred"],
      function(message) {
        expect(message).to.equal("IT IS A VERY PRETTY DAY for Fred!")
        minions.server.stop()
        done()
      }
    )

    minions.halp(done)
  }
)



test.using(
  "retaining minions and reporting objects",
  ["./minions", "nrtv-dispatcher"],
  function(expect, done, minions, Dispatcher) {

    var dispatcher = new Dispatcher()

    minions.server.start(8888, dispatcher)

    var api = minions.api.at("http://localhost:8888")

    api.retainMinion(
      function(minion) {
        minion.addTask(
          function(minion) {
            minion.report({
              friends: 3
            })
          },
          function(message) {
            expect(message).to.have.property("friends", 3)
            minion.resign()
            minions.server.stop()
            done()
          }
        )
      }
    )

    minions.halp(done)
  }
)
