let intentionalLogout = false

export function markIntentionalLogout() {
  intentionalLogout = true
}

export function clearIntentionalLogout() {
  intentionalLogout = false
}

export function isIntentionalLogout() {
  return intentionalLogout
}
