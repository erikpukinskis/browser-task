var test = require("nrtv-test")(require)

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
  ["./minions", "button-server"],
  function(expect, done, MinionQueue, buttonServer) {

    var queue = new MinionQueue()

    buttonServer.start(8888)

    queue.addTask("blah",
      function doSomeFunStuff(minion, iframe) {
        minion.browse("/", function() {
          minion.press(".hai")
          minion.report(iframe.contentDocument.querySelector("body").innerHTML)          
        })
      }, function report(message) {
        expect(message).to.equal("a hey ahoy!")
        done()
        buttonServer.stop()
      }
    )

    console.log("---\nExcuse me, human!\n\nYou have 10 seconds to open http://localhost:8888/minions in a web\nbrowser so the tests can finish! Go!\n\nLove,\nComputer\n---")

    done.failAfter(10000)
  }
)