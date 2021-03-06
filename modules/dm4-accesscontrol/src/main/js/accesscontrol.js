import dm5 from 'dm5'

const state = {
  username: undefined,    // the logged in user (string); falsish if no user is logged in
  visible: false          // Login dialog visibility
}

const actions = {

  login (_, credentials) {
    return dm5.restClient.login(credentials).then(response => {
      const username = credentials.username
      console.log('Login', username)
      setUsername(username)
      return true
    }).catch(error => {
      console.log('Login failed', error)
      return false
    })
  },

  logout () {
    console.log('Logout', state.username)
    dm5.restClient.logout()
    setUsername()
  },

  openLoginDialog () {
    state.visible = true
  },

  closeLoginDialog () {
    state.visible = false
  },
}

// init state

dm5.restClient.getUsername().then(username => {
  state.username = username
})

// state helper

function setUsername (username) {
  state.username = username
}

//

export default {
  state,
  actions
}
