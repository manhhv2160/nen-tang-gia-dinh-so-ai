export class DateFormatter {
  static formatDate(value) {
    if (!value) return '—';
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
    if (!match) return '—';
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  static formatLifeDates(birthDate, deathDate) {
    const birthYear = birthDate ? String(birthDate).slice(0, 4) : null;
    const deathYear = deathDate ? String(deathDate).slice(0, 4) : null;
    if (birthYear && deathYear) return `${birthYear} – ${deathYear}`;
    if (birthYear) return birthYear;
    if (deathYear) return `— ${deathYear}`;
    return 'Chưa rõ năm sinh';
  }

  static formatAge(birthDate, deathDate = null, today = new Date()) {
    if (!birthDate) return '—';
    const birth = new Date(`${String(birthDate).slice(0, 10)}T00:00:00Z`);
    const end = deathDate
      ? new Date(`${String(deathDate).slice(0, 10)}T00:00:00Z`)
      : today;
    if (Number.isNaN(birth.valueOf()) || Number.isNaN(end.valueOf())) return '—';
    let age = end.getUTCFullYear() - birth.getUTCFullYear();
    const beforeBirthday = end.getUTCMonth() < birth.getUTCMonth()
      || (end.getUTCMonth() === birth.getUTCMonth() && end.getUTCDate() < birth.getUTCDate());
    if (beforeBirthday) age -= 1;
    return age < 0 ? '—' : `${age} tuổi`;
  }

  static formatGeneration(generation) {
    return Number.isInteger(Number(generation)) && Number(generation) > 0
      ? `Thế hệ ${generation}`
      : 'Chưa rõ thế hệ';
  }
}
