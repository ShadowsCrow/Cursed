from __future__ import annotations

import unittest

from cursed_platform.config import ConfigurationError, load_settings


class PlatformConfigurationTest(unittest.TestCase):
    def test_development_configuration_is_loaded(self):
        settings = load_settings(
            {
                "CURSED_ENV": "development",
                "CURSED_PLATFORM_DATABASE_URL": "postgresql+psycopg://cursed:cursed@localhost:5432/cursed",
                "CURSED_API_PORT": "8000",
                "CURSED_CORS_ORIGINS": "http://localhost:5173,http://127.0.0.1:5173",
            }
        )
        self.assertEqual(settings.environment, "development")
        self.assertEqual(settings.api_port, 8000)
        self.assertEqual(len(settings.cors_origins), 2)

    def test_database_url_is_required(self):
        with self.assertRaisesRegex(ConfigurationError, "CURSED_PLATFORM_DATABASE_URL"):
            load_settings({"CURSED_ENV": "test"})

    def test_port_must_be_valid(self):
        with self.assertRaises(ConfigurationError):
            load_settings(
                {
                    "CURSED_PLATFORM_DATABASE_URL": "sqlite:///test.db",
                    "CURSED_API_PORT": "0",
                }
            )


if __name__ == "__main__":
    unittest.main()


class DevAuthConfigTest(unittest.TestCase):
    BASE = {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///dev.sqlite"}

    def test_dev_auth_desligado_por_padrao_e_proibido_em_producao(self):
        from cursed_platform.config import ConfigurationError, load_settings

        self.assertFalse(load_settings(self.BASE).dev_auth)
        self.assertTrue(load_settings({**self.BASE, "CURSED_DEV_AUTH": "1"}).dev_auth)
        with self.assertRaisesRegex(ConfigurationError, "CURSED_DEV_AUTH"):
            load_settings({**self.BASE, "CURSED_DEV_AUTH": "1", "CURSED_ENV": "production"})
