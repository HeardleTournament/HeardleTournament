## Setup Instructions

1. **Clone the repository**

   ```bash
   git clone https://github.com/RobinCouture/HeardleTournament.git
   cd HeardleTournament
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Then edit `.env.local` and fill in your actual API keys:

   - Get a YouTube Data API key from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Setup Firebase project and copy the config values
   - Add your playlist URLs

4. **Run the development server**
   ```bash
   npm run dev
   ```

## Environment Variables

See `.env.example` for all required environment variables. Create a `.env.local` file with your actual values.

**Note**: Never commit actual API keys to the repository!
