import React, { useState, useRef, useEffect } from 'react'
import { CogIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useTheme } from '../contexts/ThemeContext'

const FloatingThemeToggle = () => {
  const { theme, setLightTheme, setDarkTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState('blue')
  const panelRef = useRef(null)

  const themeColors = [
    { name: 'blue', color: 'bg-blue-600', darkColor: 'bg-blue-500' },
    { name: 'purple', color: 'bg-purple-600', darkColor: 'bg-purple-500' },
    { name: 'gray', color: 'bg-gray-600', darkColor: 'bg-gray-500' },
    { name: 'slate', color: 'bg-slate-600', darkColor: 'bg-slate-500' },
    { name: 'indigo', color: 'bg-indigo-600', darkColor: 'bg-indigo-500' },
    { name: 'cyan', color: 'bg-cyan-600', darkColor: 'bg-cyan-500' },
  ]

  const togglePanel = () => {
    setIsOpen(!isOpen)
  }

  const handleThemeChange = (newTheme) => {
    if (newTheme === 'light') {
      setLightTheme()
    } else {
      setDarkTheme()
    }
  }

  const handleColorChange = (colorName) => {
    setSelectedColor(colorName)
    // You can implement color theme logic here if needed
  }

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="fixed top-4 right-4 z-50" ref={panelRef}>
      {/* Theme Panel */}
      {isOpen && (
        <div className="absolute top-12 right-0 w-64 rounded-lg shadow-xl border border-blue-200 bg-white backdrop-blur-sm transition-all duration-200">
          {/* Panel Header */}
          <div className="flex items-center justify-between p-4 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-blue-100">
            <h3 className="font-semibold text-blue-900">Theme</h3>
            <button
              onClick={togglePanel}
              className="p-1 rounded hover:bg-blue-200 text-blue-600 transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Panel Content */}
          <div className="p-4 space-y-4">
            {/* Theme Mode Selection */}
            <div>
              <h4 className="text-sm font-medium mb-2 text-slate-700">Mode</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`flex-1 px-3 py-2 text-xs rounded border transition-colors ${
                    theme === 'light'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-200'
                  }`}
                >
                  Light
                </button>
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`flex-1 px-3 py-2 text-xs rounded border transition-colors ${
                    theme === 'dark'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-200'
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>

            {/* Theme Color Selection */}
            <div>
              <h4 className="text-sm font-medium mb-2 text-slate-700">Theme Color</h4>
              <div className="grid grid-cols-6 gap-2">
                {themeColors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => handleColorChange(color.name)}
                    className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 hover:shadow-md ${
                      selectedColor === color.name
                        ? 'border-blue-400 shadow-lg ring-2 ring-blue-200'
                        : 'border-slate-200 hover:border-slate-300'
                    } ${color.color}`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={togglePanel}
        className={`group relative p-3 rounded-full shadow-lg border hover:shadow-xl transition-all duration-200 hover:scale-105 ${
          isOpen 
            ? 'bg-blue-600 border-blue-600' 
            : 'bg-blue-600 border-blue-600 hover:bg-blue-700'
        }`}
        title="Theme Settings"
      >
        <CogIcon 
          className={`h-6 w-6 transition-all duration-300 text-white ${
            isOpen ? 'rotate-90' : 'rotate-0'
          }`} 
        />
      </button>
    </div>
  )
}

export default FloatingThemeToggle
