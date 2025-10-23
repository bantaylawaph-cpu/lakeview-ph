import { useEffect, useState } from 'react';

// Manages yearFrom/yearTo and validates range
export default function useYearRange(initialFrom = '', initialTo = '') {
  const [yearFrom, setYearFrom] = useState(initialFrom);
  const [yearTo, setYearTo] = useState(initialTo);
  const [yearError, setYearError] = useState('');

  useEffect(() => {
    const curYr = new Date().getFullYear();
    const yf = yearFrom ? Number(yearFrom) : null;
    const yt = yearTo ? Number(yearTo) : null;
    const isValid = (y) => y && /^\d{4}$/.test(String(y)) && y >= 1970 && y <= curYr + 1;
    let err = '';
    if (yearFrom && !isValid(yf)) err = 'Invalid from year';
    else if (yearTo && !isValid(yt)) err = 'Invalid to year';
    else if (isValid(yf) && isValid(yt) && yf > yt) err = 'Year from must not exceed year to';
    setYearError(err);
  }, [yearFrom, yearTo]);

  return { yearFrom, setYearFrom, yearTo, setYearTo, yearError };
}
