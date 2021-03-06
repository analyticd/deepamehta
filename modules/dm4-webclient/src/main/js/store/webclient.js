import Vue from 'vue'
import Vuex from 'vuex'
import dm5 from 'dm5'

Vue.use(Vuex)

var compCount = 0

const state = {
  components: {}
}

const actions = {

  registerComponent (_, {extensionPoint, component}) {
    var comps = state.components[extensionPoint]
    if (!comps) {
      state.components[extensionPoint] = comps = []
    }
    component._dm5_id = compCount++
    comps.push(component)
  },

  unselectIf ({dispatch}, id) {
    console.log('unselectIf', id, isSelected(id))
    if (isSelected(id)) {
      dispatch('stripSelectionFromRoute')
    }
  },

  // WebSocket messages

  _processDirectives ({dispatch}, directives) {
    console.log(`Webclient: processing ${directives.length} directives`, directives)
    directives.forEach(dir => {
      switch (dir.type) {
      case "UPDATE_TOPIC":
        displayObjectIf(new dm5.Topic(dir.arg))
        break
      case "DELETE_TOPIC":
        dispatch('unselectIf', dir.arg.id)
        break
      case "UPDATE_ASSOCIATION":
        displayObjectIf(new dm5.Assoc(dir.arg))
        break
      case "DELETE_ASSOCIATION":
        dispatch('unselectIf', dir.arg.id)
        break
      }
    })
  }
}

const store = new Vuex.Store({
  state,
  actions
})

export default store

// ---

function displayObjectIf (object) {
  if (isSelected(object.id)) {
    store.dispatch('displayObject', object)
  }
}

function isSelected (id) {
  const object = state.detailPanel.object
  return object && object.id === id
}
