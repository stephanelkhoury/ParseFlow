function formatFieldName(fieldName) {
    if (!fieldName) return '';
    
    return fieldName
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .map(word => {
            if (word.toLowerCase() === 'id') return 'ID';
            if (word.toLowerCase() === 'email') return 'Email';
            if (word.toLowerCase() === 'url') return 'URL';
            if (word.toLowerCase() === 'api') return 'API';
            if (word.toLowerCase() === 'ui') return 'UI';
            if (word.toLowerCase() === 'ux') return 'UX';
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
}

const testColumns = [
    'Terms Conditions',
    'First Name',
    'Last Name', 
    'Company',
    'Which Statement Best Describes You',
    'Contact Number',
    'Email Address',
    'Where Are You Based',
    'Region Province'
];

console.log('Testing column formatting:');
testColumns.forEach(col => {
    console.log(`'${col}' → '${formatFieldName(col)}'`);
});
