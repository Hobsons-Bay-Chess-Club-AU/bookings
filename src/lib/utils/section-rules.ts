import { SectionRules } from '@/lib/types/database'

export interface ValidationResult {
    isValid: boolean
    error?: string
}

export interface ParticipantData {
    date_of_birth?: string
    gender?: string
}

/**
 * Validates if a participant meets the section rules
 */
export function validateSectionRules(
    rules: SectionRules | undefined,
    participant: ParticipantData
): ValidationResult {
    // If no rules defined, accept everyone
    if (!rules) {
        return { isValid: true }
    }

    // Validate age constraint
    if (rules.age_constraint?.enabled) {
        const ageResult = validateAgeConstraint(rules.age_constraint, participant.date_of_birth)
        if (!ageResult.isValid) {
            return ageResult
        }
    }

    // Validate gender rules
    if (rules.gender_rules?.enabled) {
        const genderResult = validateGenderRules(rules.gender_rules, participant.gender)
        if (!genderResult.isValid) {
            return genderResult
        }
    }

    return { isValid: true }
}

/**
 * Validates age constraint rules
 */
function validateAgeConstraint(
    ageConstraint: NonNullable<SectionRules['age_constraint']>,
    dateOfBirth?: string
): ValidationResult {
    if (!dateOfBirth) {
        return {
            isValid: false,
            error: 'Date of birth is required for this section'
        }
    }

    const birthDate = new Date(dateOfBirth)

    // Check minimum date (youngest age)
    if (ageConstraint.min_date) {
        const minDate = new Date(ageConstraint.min_date)
        if (birthDate > minDate) {
            return {
                isValid: false,
                error: ageConstraint.description || 
                       `Participant must be born on or before ${minDate.toLocaleDateString()}`
            }
        }
    }

    // Check maximum date (oldest age)
    if (ageConstraint.max_date) {
        const maxDate = new Date(ageConstraint.max_date)
        if (birthDate < maxDate) {
            return {
                isValid: false,
                error: ageConstraint.description || 
                       `Participant must be born on or after ${maxDate.toLocaleDateString()}`
            }
        }
    }

    return { isValid: true }
}

/**
 * Validates gender rules
 */
function validateGenderRules(
    genderRules: NonNullable<SectionRules['gender_rules']>,
    gender?: string
): ValidationResult {
    if (!gender) {
        return {
            isValid: false,
            error: 'Gender is required for this section'
        }
    }

    if (!genderRules.allowed_genders.includes(gender)) {
        const allowedGenders = genderRules.allowed_genders
            .map(g => g.charAt(0).toUpperCase() + g.slice(1))
            .join(', ')
        
        return {
            isValid: false,
            error: genderRules.description || 
                   `This section is only open to: ${allowedGenders}`
        }
    }

    return { isValid: true }
}

/**
 * Gets a human-readable description of the section rules
 */
export function getSectionRulesDescription(rules: SectionRules | undefined): string {
    if (!rules) {
        return 'Open to all participants'
    }

    const descriptions: string[] = []

    if (rules.age_constraint?.enabled) {
        const ageDesc = rules.age_constraint.description || 
                       getAgeConstraintDescription(rules.age_constraint)
        descriptions.push(ageDesc)
    }

    if (rules.gender_rules?.enabled) {
        const genderDesc = rules.gender_rules.description || 
                          getGenderRulesDescription(rules.gender_rules)
        descriptions.push(genderDesc)
    }

    return descriptions.length > 0 ? descriptions.join('. ') : 'Open to all participants'
}

function getAgeConstraintDescription(ageConstraint: NonNullable<SectionRules['age_constraint']>): string {
    if (ageConstraint.min_date && ageConstraint.max_date) {
        const minDate = new Date(ageConstraint.min_date)
        const maxDate = new Date(ageConstraint.max_date)
        return `Age: Born between ${minDate.toLocaleDateString()} and ${maxDate.toLocaleDateString()}`
    } else if (ageConstraint.min_date) {
        const minDate = new Date(ageConstraint.min_date)
        return `Age: Born on or before ${minDate.toLocaleDateString()}`
    } else if (ageConstraint.max_date) {
        const maxDate = new Date(ageConstraint.max_date)
        return `Age: Born on or after ${maxDate.toLocaleDateString()}`
    }
    return 'Age restrictions apply'
}

function getGenderRulesDescription(genderRules: NonNullable<SectionRules['gender_rules']>): string {
    const allowedGenders = genderRules.allowed_genders
        .map(g => g.charAt(0).toUpperCase() + g.slice(1))
        .join(', ')
    return `Gender: Open to ${allowedGenders}`
}
