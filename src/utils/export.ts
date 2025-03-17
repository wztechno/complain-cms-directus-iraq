export function exportToCSV(data: any[], headers: string[], filename: string) {
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(item => 
      headers.map(header => {
        const value = item[header] || '';
        // Wrap strings containing commas in quotes
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"`
          : value;
      }).join(',')
    )
  ].join('\n');
  
  // Create and download the CSV file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
} 