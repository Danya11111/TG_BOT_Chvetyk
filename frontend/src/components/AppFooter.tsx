import { useCustomerConfig } from '../hooks/useCustomerConfig';

export const AppFooter = () => {
  const { config } = useCustomerConfig();
  const botName = config?.brand?.botName || 'FlowersStudioBot';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '56px',
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        padding: '6px 0',
        backgroundColor: 'var(--bg-main)',
        zIndex: 998,
      }}
    >
      @{botName}
    </div>
  );
};
