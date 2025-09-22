import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-yugioh-blue text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Yu-Gi-Oh Deck Builder</h1>
          <p className="text-blue-100 mt-2">Progression Series Edition</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">My Binders</h2>
            <p className="text-gray-600 mb-4">Manage your card collections</p>
            <button className="btn-primary">
              View Binders
            </button>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Deck Builder</h2>
            <p className="text-gray-600 mb-4">Create decks from your collection</p>
            <button className="btn-primary">
              Build Deck
            </button>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Card Search</h2>
            <p className="text-gray-600 mb-4">Browse the Yu-Gi-Oh database</p>
            <button className="btn-secondary">
              Search Cards
            </button>
          </div>
        </div>

        <div className="mt-12 text-center">
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">
            Welcome to the Progression Series!
          </h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Build your collection by opening booster packs chronologically,
            then create powerful decks using only the cards you own.
            Perfect for progression series gameplay with friends.
          </p>
        </div>
      </main>
    </div>
  )
}

export default App
