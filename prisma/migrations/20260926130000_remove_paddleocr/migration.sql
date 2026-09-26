ALTER TABLE `AiProviderSetting`
  DROP COLUMN `paddleEncryptedToken`,
  DROP COLUMN `paddleEncryptionIv`,
  DROP COLUMN `paddleAuthTag`,
  DROP COLUMN `paddleTokenHint`;
