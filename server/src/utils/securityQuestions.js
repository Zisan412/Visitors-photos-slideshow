const questions = {
  first_school: 'What was the name of your first school?',
  first_pet: 'What was the name of your first pet?',
  birth_city: 'In what city were you born?',
  favorite_teacher: 'What was the name of a favorite teacher?',
};

function normalizeSecurityAnswer(answer) {
  return answer.normalize('NFKC').trim().toLocaleLowerCase('en-US');
}

module.exports = { normalizeSecurityAnswer, questions };
