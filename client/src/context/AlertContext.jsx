import { createContext, useCallback, useContext, useRef, useState } from 'react';

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [alert, setAlert] = useState(null);
  const timer = useRef(null);

  // type is 'success' or 'error'
  const showAlert = useCallback((type, msg, time = 7) => {
    clearTimeout(timer.current);
    setAlert({ type, msg });
    timer.current = setTimeout(() => setAlert(null), time * 1000);
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {alert && <div className={`alert alert--${alert.type}`}>{alert.msg}</div>}
      {children}
    </AlertContext.Provider>
  );
}

export const useAlert = () => useContext(AlertContext);
