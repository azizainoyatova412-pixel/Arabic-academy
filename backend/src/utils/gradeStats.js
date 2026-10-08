const TOTAL_LESSONS = 12;

function buildGradeChart(students = []) {
  // 12 ta dars bo'yicha statistika hisoblash
  const lessonStats = Array.from({ length: TOTAL_LESSONS }, (_, idx) => {
    const lessonNum = idx + 1;
    let sum = 0;
    let count = 0;

    students.forEach((s) => {
      const grades = s.lesson_grades || {};
      const g = grades[lessonNum] ?? grades[String(lessonNum)];
      if (g !== undefined && g !== null && g !== '') {
        const numG = Number(g);
        if (Number.isFinite(numG) && numG >= 0 && numG <= 5) {
          sum += numG;
          count += 1;
        }
      }
    });

    const avg = count === 0 ? 0 : Number((sum / count).toFixed(1));
    return {
      lessonNum,
      label: `${lessonNum}-dars`,
      averageScore: avg,
      gradedCount: count,
    };
  });

  // Guruh umumiy o'quvchilari statistikasi
  let totalScoreSum = 0;
  let highestScore = 0;
  const scoreBuckets = [0, 0, 0, 0, 0, 0]; // 0, 1, 2, 3, 4, 5 ballar

  students.forEach((s) => {
    const pts = Number(s.current_month_points || 0);
    totalScoreSum += pts;
    if (pts > highestScore) highestScore = pts;

    // Har bir o'quvchining o'rtacha dars bali
    const grades = s.lesson_grades || {};
    const enteredGrades = Object.values(grades).map(Number).filter((v) => Number.isFinite(v) && v >= 0 && v <= 5);
    if (enteredGrades.length > 0) {
      const avgStudentGrade = Math.round(enteredGrades.reduce((a, b) => a + b, 0) / enteredGrades.length);
      if (avgStudentGrade >= 0 && avgStudentGrade <= 5) {
        scoreBuckets[avgStudentGrade] += 1;
      }
    } else if (pts > 0) {
      const normalized = Math.min(5, Math.max(0, Math.round(pts / TOTAL_LESSONS)));
      scoreBuckets[normalized] += 1;
    } else {
      scoreBuckets[0] += 1;
    }
  });

  const totalStudents = students.length;
  const overallAverage = totalStudents === 0 ? 0 : Number((totalScoreSum / totalStudents).toFixed(1));

  return {
    totalLessons: TOTAL_LESSONS,
    lessonStats,
    // Ustunli diagramma uchun 12 dars ma'lumotlari:
    labels: lessonStats.map((ls) => `${ls.lessonNum}-dars`),
    values: lessonStats.map((ls) => ls.averageScore),
    maxValue: 5,
    averageScore: overallAverage,
    highestScore,
    scoreBuckets,
  };
}

module.exports = { buildGradeChart, TOTAL_LESSONS };

