-- Add wallet_address column to profiles table for certificate NFT minting
-- This allows users to bind their wallet so certificates can be minted to their address

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON profiles(wallet_address) 
WHERE wallet_address IS NOT NULL;

-- Add comment
COMMENT ON COLUMN profiles.wallet_address IS 'Ethereum wallet address for receiving certificate NFTs. Stored in checksummed format (EIP-55).';

