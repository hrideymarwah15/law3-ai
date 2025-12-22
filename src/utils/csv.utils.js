/**
 * CSV Utility Module
 * Production-grade CSV conversion utilities
 * 
 * Features:
 * - Handles nested objects and arrays
 * - Proper escaping of special characters
 * - Support for multiple data formats
 * - Streaming support for large datasets
 */

/**
 * Escape a value for CSV format
 * @param {*} value - Value to escape
 * @returns {string}
 */
function escapeCSVValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  // Convert to string
  let stringValue = typeof value === 'object' 
    ? JSON.stringify(value) 
    : String(value);

  // Check if escaping is needed
  const needsEscaping = stringValue.includes(',') || 
                        stringValue.includes('"') || 
                        stringValue.includes('\n') || 
                        stringValue.includes('\r');

  if (needsEscaping) {
    // Escape double quotes by doubling them
    stringValue = stringValue.replace(/"/g, '""');
    return `"${stringValue}"`;
  }

  return stringValue;
}

/**
 * Flatten a nested object into a single-level object
 * @param {Object} obj - Object to flatten
 * @param {string} [prefix=''] - Prefix for nested keys
 * @param {Object} [result={}] - Accumulated result
 * @returns {Object}
 */
function flattenObject(obj, prefix = '', result = {}) {
  if (obj === null || obj === undefined) {
    return result;
  }

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}_${key}` : key;

    if (Array.isArray(value)) {
      // For arrays, convert to JSON string or join simple values
      if (value.length === 0) {
        result[newKey] = '';
      } else if (typeof value[0] === 'object') {
        result[newKey] = JSON.stringify(value);
      } else {
        result[newKey] = value.join('; ');
      }
    } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      // Recursively flatten nested objects
      flattenObject(value, newKey, result);
    } else if (value instanceof Date) {
      result[newKey] = value.toISOString();
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Convert an array of objects to CSV string
 * @param {Object[]} data - Array of objects to convert
 * @param {Object} [options={}] - Conversion options
 * @param {string[]} [options.columns] - Specific columns to include (in order)
 * @param {Object} [options.headers] - Custom header names { columnKey: 'Display Name' }
 * @param {boolean} [options.flatten=true] - Whether to flatten nested objects
 * @param {string} [options.delimiter=','] - Field delimiter
 * @param {string} [options.lineEnding='\n'] - Line ending character
 * @returns {string}
 */
function convertToCSV(data, options = {}) {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  const {
    columns = null,
    headers = {},
    flatten = true,
    delimiter = ',',
    lineEnding = '\n',
  } = options;

  // Flatten data if needed
  const processedData = flatten 
    ? data.map(item => flattenObject(item))
    : data;

  // Get all unique keys from all objects
  const allKeys = new Set();
  processedData.forEach(item => {
    Object.keys(item).forEach(key => allKeys.add(key));
  });

  // Determine column order
  const columnOrder = columns || Array.from(allKeys);

  // Build header row
  const headerRow = columnOrder
    .map(col => escapeCSVValue(headers[col] || formatHeaderName(col)))
    .join(delimiter);

  // Build data rows
  const dataRows = processedData.map(item => {
    return columnOrder
      .map(col => escapeCSVValue(item[col]))
      .join(delimiter);
  });

  return [headerRow, ...dataRows].join(lineEnding);
}

/**
 * Format a snake_case or camelCase key into a readable header
 * @param {string} key 
 * @returns {string}
 */
function formatHeaderName(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Convert user export data to CSV format
 * This handles the specific structure of user data exports
 * @param {Object} exportData - The export data object
 * @returns {Object} - Object containing multiple CSV strings for each section
 */
function convertUserExportToCSV(exportData) {
  const result = {
    files: [],
    combined: '',
  };

  // User Profile
  if (exportData.profile) {
    const profileCSV = convertToCSV([exportData.profile], {
      headers: {
        id: 'User ID',
        email: 'Email',
        phone: 'Phone',
        first_name: 'First Name',
        last_name: 'Last Name',
        display_name: 'Display Name',
        city: 'City',
        state: 'State',
        country: 'Country',
        preferred_language: 'Language',
        created_at: 'Account Created',
      }
    });
    result.files.push({ name: 'profile.csv', content: profileCSV });
  }

  // Consultations
  if (exportData.consultations && exportData.consultations.length > 0) {
    const consultationsCSV = convertToCSV(exportData.consultations, {
      columns: ['reference_number', 'lawyer_name', 'status', 'type', 'booking_date', 'booking_time', 'fee', 'created_at'],
      headers: {
        reference_number: 'Reference',
        lawyer_name: 'Lawyer',
        status: 'Status',
        type: 'Type',
        booking_date: 'Date',
        booking_time: 'Time',
        fee: 'Fee (Paisa)',
        created_at: 'Booked On',
      }
    });
    result.files.push({ name: 'consultations.csv', content: consultationsCSV });
  }

  // Cases
  if (exportData.cases && exportData.cases.length > 0) {
    const casesCSV = convertToCSV(exportData.cases, {
      columns: ['case_title', 'case_number', 'case_type', 'status', 'court_name', 'next_hearing_date', 'created_at'],
      headers: {
        case_title: 'Title',
        case_number: 'Case Number',
        case_type: 'Type',
        status: 'Status',
        court_name: 'Court',
        next_hearing_date: 'Next Hearing',
        created_at: 'Created',
      }
    });
    result.files.push({ name: 'cases.csv', content: casesCSV });
  }

  // Payments
  if (exportData.payments && exportData.payments.length > 0) {
    const paymentsCSV = convertToCSV(exportData.payments, {
      columns: ['payment_reference', 'amount', 'status', 'payment_method', 'paid_at', 'created_at'],
      headers: {
        payment_reference: 'Reference',
        amount: 'Amount (Paisa)',
        status: 'Status',
        payment_method: 'Method',
        paid_at: 'Paid At',
        created_at: 'Initiated',
      }
    });
    result.files.push({ name: 'payments.csv', content: paymentsCSV });
  }

  // Reviews
  if (exportData.reviews && exportData.reviews.length > 0) {
    const reviewsCSV = convertToCSV(exportData.reviews, {
      columns: ['lawyer', 'rating', 'review', 'created_at'],
      headers: {
        lawyer: 'Lawyer',
        rating: 'Rating',
        review: 'Review Text',
        created_at: 'Date',
      }
    });
    result.files.push({ name: 'reviews.csv', content: reviewsCSV });
  }

  // Reminders
  if (exportData.reminders && exportData.reminders.length > 0) {
    const remindersCSV = convertToCSV(exportData.reminders, {
      columns: ['title', 'description', 'reminder_type', 'reminder_datetime', 'status'],
      headers: {
        title: 'Title',
        description: 'Description',
        reminder_type: 'Type',
        reminder_datetime: 'Date/Time',
        status: 'Status',
      }
    });
    result.files.push({ name: 'reminders.csv', content: remindersCSV });
  }

  // Chat History
  if (exportData.chat_history && exportData.chat_history.length > 0) {
    const chatCSV = convertToCSV(exportData.chat_history, {
      columns: ['content', 'type', 'room_id', 'sent_at'],
      headers: {
        content: 'Message',
        type: 'Type',
        room_id: 'Room ID',
        sent_at: 'Sent At',
      }
    });
    result.files.push({ name: 'chat_history.csv', content: chatCSV });
  }

  // Notifications
  if (exportData.notifications && exportData.notifications.length > 0) {
    const notificationsCSV = convertToCSV(exportData.notifications, {
      columns: ['title', 'body', 'notification_type', 'is_read', 'created_at'],
      headers: {
        title: 'Title',
        body: 'Message',
        notification_type: 'Type',
        is_read: 'Read',
        created_at: 'Date',
      }
    });
    result.files.push({ name: 'notifications.csv', content: notificationsCSV });
  }

  // Create combined CSV with sections
  const sections = [];
  result.files.forEach(file => {
    sections.push(`\n=== ${file.name.replace('.csv', '').toUpperCase()} ===\n`);
    sections.push(file.content);
    sections.push('\n');
  });

  // Add export metadata
  sections.push('\n=== EXPORT INFO ===\n');
  sections.push(`User ID,${exportData.export_info?.user_id || ''}\n`);
  sections.push(`Exported At,${exportData.export_info?.exported_at || new Date().toISOString()}\n`);
  sections.push(`Includes,${exportData.export_info?.includes?.join('; ') || ''}\n`);

  result.combined = sections.join('');

  return result;
}

/**
 * Convert admin report data to CSV
 * @param {string} reportType - Type of report
 * @param {Object[]} data - Report data
 * @returns {string}
 */
function convertAdminReportToCSV(reportType, data) {
  const reportConfigs = {
    users: {
      columns: ['id', 'email', 'phone', 'display_name', 'role', 'status', 'city', 'state', 'created_at'],
      headers: {
        id: 'User ID',
        email: 'Email',
        phone: 'Phone',
        display_name: 'Name',
        role: 'Role',
        status: 'Status',
        city: 'City',
        state: 'State',
        created_at: 'Registered',
      }
    },
    lawyers: {
      columns: ['id', 'display_name', 'email', 'bar_council_number', 'specialization', 'experience_years', 'office_city', 'rating', 'total_consultations', 'verification_status', 'created_at'],
      headers: {
        id: 'Lawyer ID',
        display_name: 'Name',
        email: 'Email',
        bar_council_number: 'Bar Council No.',
        specialization: 'Specialization',
        experience_years: 'Experience (Years)',
        office_city: 'City',
        rating: 'Rating',
        total_consultations: 'Total Consultations',
        verification_status: 'Verification Status',
        created_at: 'Registered',
      }
    },
    consultations: {
      columns: ['reference_number', 'user_name', 'lawyer_name', 'booking_date', 'booking_time', 'consultation_type', 'status', 'amount', 'payment_status', 'created_at'],
      headers: {
        reference_number: 'Reference',
        user_name: 'User',
        lawyer_name: 'Lawyer',
        booking_date: 'Date',
        booking_time: 'Time',
        consultation_type: 'Type',
        status: 'Status',
        amount: 'Amount (Paisa)',
        payment_status: 'Payment Status',
        created_at: 'Created',
      }
    },
    payments: {
      columns: ['payment_reference', 'user_name', 'amount', 'currency', 'status', 'payment_method', 'razorpay_payment_id', 'paid_at', 'created_at'],
      headers: {
        payment_reference: 'Reference',
        user_name: 'User',
        amount: 'Amount (Paisa)',
        currency: 'Currency',
        status: 'Status',
        payment_method: 'Method',
        razorpay_payment_id: 'Razorpay ID',
        paid_at: 'Paid At',
        created_at: 'Initiated',
      }
    },
    reviews: {
      columns: ['id', 'user_name', 'lawyer_name', 'rating', 'title', 'review_text', 'is_approved', 'created_at'],
      headers: {
        id: 'Review ID',
        user_name: 'User',
        lawyer_name: 'Lawyer',
        rating: 'Rating',
        title: 'Title',
        review_text: 'Review',
        is_approved: 'Approved',
        created_at: 'Date',
      }
    },
  };

  const config = reportConfigs[reportType] || {};
  return convertToCSV(data, config);
}

module.exports = {
  convertToCSV,
  flattenObject,
  escapeCSVValue,
  formatHeaderName,
  convertUserExportToCSV,
  convertAdminReportToCSV,
};
