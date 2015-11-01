Do stuff in other peoples' browsers.

Start a server:

    cd ~
    npm install nrtv-minions
    node nrtv-minions/start

Start working by visiting http://localhost:9777/minions

Add a task with the API:

    var minions = require("nrtv-minions")

    minions.api("http://localhost:9777").addTask(
      function(minion) {
        minion.visit("/")

        minion.pressButton(
          ".go",
          reportBack
        )

        function() {
          minion.report("ok")
        }
      },
      function(message) {
        if (message == "ok") {
          console.log("Yay, everything is OK")
        } else {
          console.log("Something went wrong.")
        }
      }
    )


# Notes

review every command, at least the first few for each user

flag things with adjectives

User 2354: [auto-declined message with prurient content]


# Why

 - you always get to a point when you want to pause the test and look in the browser anyway

 - it works on any browser you want, so you can use it for testing too
 
 - I will need it for screencasting tests, customer support, etc anyway

 - iframe stuff doesn't work in zombiejs. In general there are holes in the zombie/jsdom coverage

 - jsdom uses ES6. Also it is a nightmare.

 - zombie uses ws which uses bufferutils which compiles stuff and slows down npm installs dramatically
 