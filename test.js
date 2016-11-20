var test = require("nrtv-test")(require)

// test.only("controlling minions through the API")
// test.only("a minion presses a button and reports back what happened")
// test.only("retaining minions and reporting objects")
test.only("proxying websockets")

test.library.define(
  "button-server",
  ["web-element", "browser-bridge", "nrtv-server", "make-request"],
  function(element, BrowserBridge, Server, makeRequest) {

    var bridge = new BrowserBridge()

    function ButtonStuff() {
      var server = new Server()

      server.addRoute(
        "get", "/slowness",
        function(request, response) {
          setTimeout(function() {
            response.send("a hey ahoy!")
          }, 100)
        }
      )

      var ahey = bridge.defineFunction(
        [makeRequest.defineOn(bridge)],
        function(makeRequest) {
          makeRequest(
            "get",
            "/slowness",
            function(text) {
              document.querySelector("body").innerHTML = text
            }
          )
        }
      )

      var butt = element(
        "button.hai",
        {onclick: ahey.evalable()},
        "O hai"
      )

      server.addRoute("get", "/", bridge.sendPage(butt))

      this.start = function(port) {
        server.start(port)
      }

      this.stop = function() {
        server.stop()
      }
    }

    return ButtonStuff
  }
)

test.using(
  "a minion presses a button and reports back what happened",
  ["./minions", "button-server", "nrtv-dispatcher"],
  function(expect, done, minions, ButtonServer, Dispatcher) {

    var app = new ButtonServer()
    var queue = new Dispatcher()
    app.start(7777)
    minions.server.start(8888, queue)

    queue.addTask(
      {host: "localhost:7777"},
      function doSomeFunStuff(testVariable, minion, iframe) {
        if (testVariable != "hi") {
          throw new Error("Minion didn't get data!")
        }

        minion.browse("/", function() {

          var button = iframe.contentDocument.querySelector(".hai")

          button.click()
          
          minion.wait.forIframe(iframe, function() {
            minion.report(iframe.contentDocument.querySelector("body").innerHTML)          
          })

        })
      },
      function(message) {
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
  ["./minions"],
  function(expect, done, minions) {

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
            verifyFREEDOM()
          }
        )
      }
    )

    function verifyFREEDOM() {
      dispatcher.addTask(
        function(minion) {
          minion.report("purd says, what purd has to say")
        },
        function(yes) {
          expect(yes).to.match(/purd/)
          minions.server.stop()
          done()          
        }
      )
    }

    minions.halp(done)
  }
)


test.using(
  "proxying websockets",
  ["./minions", "nrtv-dispatcher", "nrtv-server", "get-socket", "browser-bridge"],
  function(expect, done, minions, Dispatcher, Server, getSocket, BrowserBridge) {

    var server = new Server()

    getSocket.handleConnections(
      server,
      function(socket) {
        socket.listen(runChecks)
      }
    )

    server.start(6543)

    var queue = new Dispatcher()

    minions.server.start(8888, queue)

    // now we have the problem that addTask can't take modules. So we need to navigate to a page that does this shit?

    var bridge = new BrowserBridge()

    var sendBoo = 
      bridge.defineFunction(
        [getSocket.defineOn(bridge)],
        function(getSocket) {
          getSocket(function(socket) {
            socket.send("boo!")
          })
        }
      )

    bridge.asap(sendBoo)

    server.addRoute("get", "/boo",
      bridge.sendPage()
    )

    queue.addTask(
      {host: "localhost:6543"},
      function(minion) {
        minion.browse("/boo", function() {
          minion.report("done")
        })
      },
      function() {}
    )

    minions.halp(done)

    function runChecks(message) {
      expect(message).to.equal("boo!")
      server.stop()
      minions.server.stop()
      done()
    }
  }
)


