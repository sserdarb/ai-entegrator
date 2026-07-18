import express from 'express';
import Amadeus from 'amadeus';

const app = express();
app.use(express.json());

let amadeusClient: Amadeus | null = null;

function getAmadeusClient() {
  if (!amadeusClient) {
    const clientId = process.env.AMADEUS_CLIENT_ID;
    const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET environment variables are required');
    }
    amadeusClient = new Amadeus({
      clientId,
      clientSecret,
    });
  }
  return amadeusClient;
}

app.post('/api/flights/search', async (req, res) => {
  try {
    const { originLocationCode, destinationLocationCode, departureDate, returnDate, adults } = req.body;
    
    if (!originLocationCode || !destinationLocationCode || !departureDate || !adults) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const amadeus = getAmadeusClient();

    const params: any = {
      originLocationCode,
      destinationLocationCode,
      departureDate,
      adults: Number(adults),
      max: 10
    };

    if (returnDate) {
      params.returnDate = returnDate;
    }

    const response = await amadeus.shopping.flightOffersSearch.get(params);
    res.json(response.data);
  } catch (error: any) {
    console.error('Amadeus API Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch flight offers' });
  }
});

app.get('/api/locations/search', async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({ error: 'Keyword is required' });
    }

    const amadeus = getAmadeusClient();
    const response = await amadeus.referenceData.locations.get({
      keyword,
      subType: 'CITY,AIRPORT'
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Amadeus API Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch locations' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
