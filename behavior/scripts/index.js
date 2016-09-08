'use strict'

const getCurrentWeather = require('./lib/getCurrentWeather')

const firstOfEntityRole = function(message, entity, role) {
  role = role || 'generic';

  const slots = message.slots
  const entityValues = message.slots[entity]
  const valsForRole = entityValues ? entityValues.values_by_role[role] : null

  return valsForRole ? valsForRole[0] : null
}

exports.handle = function handle(client) {
  const sayHello = client.createStep({
    satisfied() {
      return Boolean(client.getConversationState().helloSent)
    },

    prompt() {
      client.addTextResponse('Hello world!')
      client.addTextResponse('I don\'t know much yet, but if you need some pointers on where to get started you should check out the docs – http://alphadocs.init.ai/?key=c0fb-addc-119f')
      client.addTextResponse('Otherwise, head over to Teach (up at the top) and start teaching me!')
      client.updateConversationState({
        helloSent: true
      })
      client.done()
    }
  })

  const untrained = client.createStep({
    satisfied() {
      return false
    },

    prompt() {
      client.addTextResponse('Apologies, but this app needs to go back to school!')
      client.done()
    },
  })

  const collectCity = client.createStep({
    satisfied() {
      return Boolean(client.getConversationState().weatherCity)
    },

    extractInfo() {
     const city = firstOfEntityRole(client.getMessagePart(), 'city')
      if (city) {
        client.updateConversationState({
          weatherCity: city,
        })
        console.log('User wants the weather in:', city.value)
      }
    },

    prompt() {
      client.addResponse('app:response:name:prompt/weather_city')
      client.done()
    },
  })

  const provideWeather = client.createStep({
    satisfied() {
      return false
    },

    prompt(callback) {
      getCurrentWeather(client.getConversationState().weatherCity.value, resultBody => {
        if (!resultBody || resultBody.cod !== 200) {
          console.log('Error getting weather.')
          callback()
          return
        }

        const weatherDescription = (
          resultBody.weather.length > 0 ?
          resultBody.weather[0].description :
          null
        )

        const weatherData = {
          temperature: Math.round(resultBody.main.temp),
          condition: weatherDescription,
          city: resultBody.name,
        }

        console.log('sending real weather:', weatherData)
        client.addResponse('app:response:name:provide_weather/current', weatherData)
        client.done()

        callback()
      })
    },
  })

  client.runFlow({
    classifications: {},
    streams: {
      main: 'getWeather',
      hi: [sayHello],
      getWeather: [collectCity, provideWeather],
    }
  })
}
