import { useEffect, useState } from 'react';
import { getCustomerConfig, CustomerConfigResponse } from '../api/config.api';

export function useCustomerConfig() {
  const [config, setConfig] = useState<CustomerConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const fetchConfig = async () => {
      try {
        const data = await getCustomerConfig();
        if (isActive) {
          setConfig(data);
        }
      } catch (error) {
        console.error('Error loading customer config:', error);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchConfig();

    return () => {
      isActive = false;
    };
  }, []);

  return { config, loading };
}
