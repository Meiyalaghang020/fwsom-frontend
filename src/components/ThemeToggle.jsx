import React from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'

const ThemeToggle = ({ className = '' }) => {
  const { theme, setLightTheme, setDarkTheme, toggleTheme } = useTheme()

  // Simple toggle button (for compact spaces)
  const SimpleToggle = () => (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700 ${className}`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
      ) : (
        <Sun className="h-5 w-5 text-slate-600 dark:text-slate-300" />
      )}
    </button>
  )

  // Dropdown menu (for more options)
  const DropdownToggle = () => (
    <Menu as="div" className="relative">
      <Menu.Button className={`p-2 rounded-lg transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700 ${className}`}>
        {theme === 'light' ? (
          <Sun className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        ) : (
          <Moon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        )}
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white dark:bg-slate-800 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="p-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={setLightTheme}
                  className={`${
                    active ? 'bg-slate-100 dark:bg-slate-700' : ''
                  } ${
                    theme === 'light' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
                  } group flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors`}
                >
                  <Sun className="mr-3 h-4 w-4" />
                  Light Mode
                  {theme === 'light' && (
                    <span className="ml-auto text-xs">✓</span>
                  )}
                </button>
              )}
            </Menu.Item>
            
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={setDarkTheme}
                  className={`${
                    active ? 'bg-slate-100 dark:bg-slate-700' : ''
                  } ${
                    theme === 'dark' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
                  } group flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors`}
                >
                  <Moon className="mr-3 h-4 w-4" />
                  Dark Mode
                  {theme === 'dark' && (
                    <span className="ml-auto text-xs">✓</span>
                  )}
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )

  // Return simple toggle by default, can be changed to DropdownToggle if needed
  return <SimpleToggle />
}

export default ThemeToggle
