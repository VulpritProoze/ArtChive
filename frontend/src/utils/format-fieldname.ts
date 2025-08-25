const formatFieldName = (field: string): string => {
    const mapping: Record<string, string> = {
      username: "Username",
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm Password",
      firstName: "First Name",
      middleName: "Middle Name",
      lastName: "Last Name",
      city: "City",
      country: "Country",
      birthday: "Birthday",
      artistTypes: "Artist Types"
    };
    return mapping[field] || field.charAt(0).toUpperCase() + field.slice(1);
  };

export default formatFieldName;