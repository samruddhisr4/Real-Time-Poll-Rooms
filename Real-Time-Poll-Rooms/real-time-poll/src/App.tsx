import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CreatePoll } from './components/CreatePoll';
import { ViewPoll } from './components/ViewPoll';

function App() {
  return (
    <BrowserRouter>
      <div className="container">
        <Routes>
          <Route path="/" element={<CreatePoll />} />
          <Route path="/poll/:id" element={<ViewPoll />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
