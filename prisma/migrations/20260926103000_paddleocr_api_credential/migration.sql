ALTER TABLE `AiProviderSetting`
  MODIFY `provider` VARCHAR(32) NOT NULL DEFAULT 'shared',
  MODIFY `encryptedApiKey` TEXT NULL,
  MODIFY `encryptionIv` VARCHAR(64) NULL,
  MODIFY `authTag` VARCHAR(64) NULL,
  MODIFY `keyHint` VARCHAR(32) NULL,
  ADD COLUMN `paddleEncryptedToken` TEXT NULL,
  ADD COLUMN `paddleEncryptionIv` VARCHAR(64) NULL,
  ADD COLUMN `paddleAuthTag` VARCHAR(64) NULL,
  ADD COLUMN `paddleTokenHint` VARCHAR(32) NULL;
