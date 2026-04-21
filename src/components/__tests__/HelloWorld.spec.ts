import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import HelloWorld from '../HelloWorld.vue'

describe('HelloWorld', () => {
  it('renders the msg prop inside an h1', () => {
    const wrapper = mount(HelloWorld, { props: { msg: 'Hello World' } })
    expect(wrapper.get('h1').text()).toBe('Hello World')
  })
})
