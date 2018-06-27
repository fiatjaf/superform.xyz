/* global firebase */

const React = require('react')
const h = require('react-hyperscript')
const render = require('react-dom').render
const Router = require('react-router-dom').BrowserRouter
const Route = require('react-router-dom').Route
const Link = require('react-router-dom').Link
const Redirect = require('react-router-dom').Redirect
const qs = require('qs')
const SplitterLayout = require('react-splitter-layout').default
const cuid = require('cuid')
const debounce = require('debounce')
const gravatarURL = require('gravatar-url')

const View = require('./View')
const Entries = require('./Entries')
const Code = require('./Code')
const UI = require('./UI')
const {n_error, n_success} = require('./helpers')

firebase.initializeApp({
  apiKey: 'AIzaSyBnsHuekLxCqbVSyb_np7j0Yn5jJK5QFpw',
  authDomain: 'superform-xyz.firebaseapp.com',
  databaseURL: 'https://superform-xyz.firebaseio.com',
  projectId: 'superform-xyz',
  storageBucket: 'superform-xyz.appspot.com',
  messagingSenderId: '736573438203'
})

const db = firebase.firestore()
db.settings({
  timestampsInSnapshots: true
})

class App extends React.Component {
  constructor () {
    super()

    this.state = {
      user: null,
      userforms: []
    }

    this.formsRef = null
    this.cancelFormsListener = () => {}
  }

  componentWillUnmount () {
    this.cancelFormsListener()
  }

  componentDidMount () {
    firebase.auth().onAuthStateChanged(user => {
      this.cancelFormsListener()

      this.setState({user})

      if (user) {
        this.cancelFormsListener = db.collection('forms').where('owner', '==', user.uid)
          .onSnapshot(e => {
            this.setState({
              userforms: e.docs.map(d => Object.assign(d.data(), {id: d.id}))
            })
          })
      }
    })

    firebase.auth().getRedirectResult()
  }

  render () {
    return (
      h(Router, [
        h('div', [
          h('.nav', [
            h('.logo', [
              h('div', [
                h(Link, {to: '/'}, [ h('img', {src: '/icon.png'}) ])
              ]),
              h('h1', [
                h(Link, {to: '/'}, 'Superform')
              ])
            ]),
            h(Route, {exact: true, path: '/:action/:form', render: ({match}) =>
              h('.clone', [
                h(Link, {to: `/new?from=${match.params.form}`}, 'Clone this')
              ])
            }),
            h('.user', this.state.user
              ? [
                h(Link, {to: '/account'}, [
                  gravatar(this.state.user.email)
                ])
              ]
              : [
                ['Google', new firebase.auth.GoogleAuthProvider()],
                ['Twitter', new firebase.auth.TwitterAuthProvider()]
              ].map(([name, provider]) =>
                h('a', {
                  onClick: () => {
                    firebase.auth().signInWithPopup(provider)
                  }
                }, 'Sign in with ' + name),
              )
            )
          ]),
          h(Route, {path: '/new', render: ({location}) => {
            let newid = cuid.slug()

            let query = qs.parse(location.search.slice(1))
            if (query.from) {
              db.doc(`forms/${query.from}`).get()
                .then(d => {
                  let data = d.data()
                  delete data.id
                  delete data.updated_at
                  data.owner = this.state.user && this.state.user.uid
                  data.created_at = firebase.firestore.Timestamp.now()
                  data.cloned_from = query.from

                  return db.doc(`forms/${newid}`).set(data)
                })
                .then(() => {
                  n_success('Cloned successfully.')
                })
                .catch(e => {
                  n_error('Failed to clone form. See console for more details.')
                  console.warn('failed to clone form:', e)
                })
            }

            return h(Redirect, {to: `/edit/${newid}`})
          }}),
          h(Route, {exact: true, path: '/account', render: () =>
            this.state.user
              ? (
                h('#profile', [
                  h('div', [
                    gravatar(this.state.user.email),
                    h('h3', this.state.user.displayName),
                    h('h4', this.state.user.email),
                    h('h5', `<${this.state.user.uid}>`),
                    h('div', [
                      h(Link, {
                        to: '/',
                        onClick: () => {
                          firebase.auth().signOut()
                        }
                      }, 'Logout')
                    ])
                  ]),
                  h('div', [
                    h('h3', 'Forms'),
                    h('.forms', this.state.userforms.map(f =>
                      h('div', [
                        h(Link, {to: `/edit/${f.id}`}, [
                          h('h4', f.id)
                        ]),
                        h('code', f.ui)
                      ])
                    ))
                  ])
                ])
              )
              : null
          }),
          h(Route, {exact: true, path: '/', render: () => h('style', {
            dangerouslySetInnerHTML: {
              __html: `#landing { display: block !important; }`
            }
          })}),
          h(Route, {exact: true, path: '/:action/:form', component: SingleForm})
        ])
      ])
    )
  }
}

class SingleForm extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      entries: [],
      form: null
    }

    this.formRef = null
    this.entriesRef = null
    this.cancelFormListener = () => {}
    this.cancelEntriesListener = () => {}

    this.secondarySizes = JSON.parse(
      localStorage.getItem('secondary-panel-sizes') ||
      '[50, 0, 0]'
    )

    this.dpanelSizeChanged = debounce(this.panelSizeChanged, 700)

    if (this.props.match.params.action === 'view') {
      this.editing = false
    } else if (this.props.match.params.action === 'edit') {
      this.editing = true
    }
  }

  componentWillUnmount () {
    this.cancelFormListener()
    this.cancelEntriesListener()
  }

  componentDidMount () {
    this.formRef = db.doc(`forms/${this.props.match.params.form}`)
    this.entriesRef = this.formRef.collection('entries')

    this.cancelFormListener = this.formRef.onSnapshot(f => {
      let form = f.exists
        ? f.data()
        : {
          owner: null,
          created_at: firebase.firestore.Timestamp.now(),
          code: `exports.reduce = function (state, entry) {
  switch (entry.type) {
    case 'normal_submission':
      state.submissions.push(entry.content)
      break
  }
}

exports.init = function () {
  return {
    submissions: []
  }
}`,
          ui: `
div
  h1 Hello, #{user.email || 'anonymous'}!
  p These are the last submissions we have:
  +list(state.submissions)
  div
    h3 Submit a new thing
    form
      +value('type', 'normal_submission')
      +field('content', 'Content')
      button 'Ok'
`
        }
      this.setState({form})
    })

    this.cancelEntriesListener = this.entriesRef.orderBy('created_at', 'asc')
      .onSnapshot(e => {
        this.setState({
          entries: e.docs.map(d => {
            let entry = d.data()
            entry.created_at = entry.created_at.toDate()
            entry.updated_at = entry.updated_at && entry.updated_at.toDate()
            entry.id = d.id
            return entry
          })
        })
      })

    firebase.auth().onAuthStateChanged(user => {
      this.setState(st => {
        st.user = user

        if (user && !st.form.owner) st.form.owner = user.uid

        return st
      })
    })

    firebase.auth().getRedirectResult()
  }

  render () {
    let secondarySizes = this.editing ? this.secondarySizes : [0, 0, 50]

    return (
      this.state.form && this.state.entries &&
        h(SplitterLayout, {
          percentage: true,
          secondaryInitialSize: secondarySizes[0],
          onSecondaryPaneSizeChange: s => this.dpanelSizeChanged(0, s)
        }, [
          h(SplitterLayout, {
            vertical: true,
            percentage: true,
            secondaryInitialSize: secondarySizes[1],
            onSecondaryPaneSizeChange: s => this.dpanelSizeChanged(1, s),
            customClassName: 'view-splitter'
          }, [
            h(View, {
              code: this.state.form.code,
              ui: this.state.form.ui,
              entries: this.state.entries,
              user: this.state.user ? {
                uid: this.state.user.uid,
                email: this.state.user.email,
                name: this.state.user.displayName
              } : {},
              addEntry: data => this.addEntry(data)
            }),
            h(Entries, {
              entries: this.state.entries,
              editEntry: (id, data) => this.editEntry(id, data),
              deleteEntry: id => this.deleteEntry(id)
            })
          ]),
          h(SplitterLayout, {
            vertical: true,
            percentage: true,
            secondaryInitialSize: secondarySizes[2],
            onSecondaryPaneSizeChange: s => this.dpanelSizeChanged(2, s)
          }, [
            h(UI, {
              code: this.state.form.ui,
              save: ui => this.saveForm({ui})
            }),
            h(Code, {
              code: this.state.form.code,
              save: code => this.saveForm({code})
            })
          ])
        ])
    )
  }

  panelSizeChanged (index, size) {
    if (this.state.editing) {
      this.secondarySizes[index] = size
      localStorage.setItem(
        'secondary-panel-sizes',
        JSON.stringify(this.secondarySizes)
      )
    }
  }

  saveForm (data) {
    this.formRef.set(Object.assign(this.state.form, data))
      .catch(e => {
        n_error('Failed to save form. See console for more details.')
        console.warn('failed to save form:', e)
      })
  }

  addEntry (data) {
    this.entriesRef.add({
      submitter: this.state.user && this.state.user.uid,
      email: this.state.user.email,
      created_at: firebase.firestore.Timestamp.now(),
      data
    })
      .then(() => {
        n_success('Created entry successfully.')
      })
      .catch(e => {
        n_error('Failed to create entry. See console for more details.')
        console.warn('failed to create entry:', e)
      })
  }

  editEntry (id, data) {
    this.entriesRef.doc(id).set({
      data,
      updated_at: firebase.firestore.Timestamp.now()
    }, {merge: true})
      .then(() => {
        n_success('Updated entry successfully.')
      })
      .catch(e => {
        n_error('Failed to update entry. See console for more details.')
        console.warn('failed to update entry:', e)
      })
  }

  deleteEntry (id) {
    this.entriesRef.doc(id).delete()
      .then(() => {
        n_success('Deleted entry successfully.')
      })
      .catch(e => {
        n_error('Failed to delete entry. See console for more details.')
        console.warn('failed to delete entry:', e)
      })
  }
}

function gravatar (email) {
  return h('img.avatar', {
    src: gravatarURL(email || '@', {
      size: 270,
      default: `https://robohash.org/${email}.png`
    })
  })
}

render(
  h(App),
  document.getElementById('app')
)
