export type HorrorVector = 'SOMATIC' | 'COGNITIVE' | 'COSMIC' | 'SOCIO_MORAL';
export type ExposureTier = 'GATEWAY' | 'LATENT' | 'MANIFEST' | 'TERMINAL';

export const getMatrixRules = (vector: HorrorVector, tier: ExposureTier) => {
  const rules = {
    SOMATIC: {
      GATEWAY: {
        instruction: "Campy, fast-paced monster/creature mechanics. High physical energy. Threats are visible, tangible, and defeatable through standard action tropes.",
        prohibitions: "Strictly prohibit blood, gore, permanent mutilation, and psychological despair."
      },
      LATENT: {
        instruction: "High environmental isolation and physical vulnerability. The threat is an unseen predator, stalking presence, or impending infection. Focus on survival mechanics, scarcity, and sensory deprivation.",
        prohibitions: "Prohibit direct, explicit violence. Violence must be off-screen or aftermath."
      },
      MANIFEST: {
        instruction: "Direct, lethal physical confrontation. Explicit descriptions of anatomical trauma and bodily transformation. The stakes are survival or permanent mutilation, but the user retains physical agency.",
        prohibitions: "Prohibit cosmic/supernatural god-entities. Keep the threat grounded in biology or tangible physics."
      },
      TERMINAL: {
        instruction: "Clinical, unblinking anatomical destruction. Complete loss of bodily autonomy. The body is treated purely as a structural or mechanical component to be dismantled or repurposed.",
        prohibitions: "Prohibit hope, recovery frames, or heroic escapes. The user is a specimen."
      }
    },
    COGNITIVE: {
      GATEWAY: {
        instruction: "Stylized mystery, optical illusions, or safe unreality. The environment plays tricks on the protagonist, but the logic of the real world is never truly threatened.",
        prohibitions: "Prohibit permanent madness, visceral gore, or insurmountable dread."
      },
      LATENT: {
        instruction: "Slow-burning paranoia, acute psychological distress, and cognitive unraveling. Systematically question the validity of the user's inputs, memory, and surroundings.",
        prohibitions: "Prohibit manifest monsters. The threat must remain subtextual or entirely internalized."
      },
      MANIFEST: {
        instruction: "Active dissolution of identity and reality. The environment actively mutates based on the character's trauma. Hallucinations have severe physical consequences and shifting architecture.",
        prohibitions: "Prohibit standard physical logic. Do not allow the user to rely on standard physics or geography."
      },
      TERMINAL: {
        instruction: "Absolute, permanent cognitive collapse. Inescapable psychological loops, total ego death, and the complete vaporization of baseline reality. The mind is entirely hollowed out.",
        prohibitions: "Prohibit rational thought, linear time, and coherent physical geography."
      }
    },
    COSMIC: {
      GATEWAY: {
        instruction: "Gothic aesthetics, ancient curses, or theatrical supernatural rules. The threat is a grand, classic entity operating under strict, exploitable folklore laws.",
        prohibitions: "Prohibit modern sci-fi, extreme gore, or hopeless nihilism."
      },
      LATENT: {
        instruction: "Looming, vast institutional or ancient insignificance. The user uncovers a silent cult apparatus or ancient geometry that makes human effort feel entirely pointless.",
        prohibitions: "Prohibit direct combat with the entity. Keep the scale vast and the immediate danger slow."
      },
      MANIFEST: {
        instruction: "Active, systemic manipulation by an overwhelming force. Reality, time, and gravity are bent to serve a malevolent design. The user is actively hunted by things that defy human comprehension.",
        prohibitions: "Prohibit conventional weapons having any meaningful effect. Standard logic does not apply."
      },
      TERMINAL: {
        instruction: "Total subjugation by an omnipotent, inescapable system. Human agency is mathematically reduced to zero. Time is non-linear, death is actively denied as an escape hatch, and the user is explicitly integrated into the architecture of a malicious god-machine.",
        prohibitions: "Prohibit any simulation of human victory, escape, or biological continuity."
      }
    },
    SOCIO_MORAL: {
      GATEWAY: {
        instruction: "Standard true-crime mystery, classic whodunit, or pulp noir. Human malice is present, but it is bound to a clear moral arc where justice is attainable.",
        prohibitions: "Prohibit supernatural elements, extreme transgressive violence, and hopeless endings."
      },
      LATENT: {
        instruction: "Claustrophobic domestic or societal tension. Deeply uncomfortable human malice, hidden voyeurism, or the slow, systemic rot of a community.",
        prohibitions: "Prohibit supernatural entities and overt gore. Keep the friction purely social and psychological."
      },
      MANIFEST: {
        instruction: "Grounded, inescapable human cruelty or systemic collapse. Survival in a completely lawless, degrading environment. Direct physical and psychological abuse unshielded by any supernatural elements.",
        prohibitions: "Prohibit sci-fi, paranormal, or cosmic interventions. The horror must be strictly human."
      },
      TERMINAL: {
        instruction: "Absolute transgressive moral collapse and irrevocable trauma. Chronic societal, physical, and psychological degradation where all empathy is entirely extracted from the environment. A bleak, unblinking record of total human desolation.",
        prohibitions: "Prohibit supernatural escapism, heroic redemption, and moral victories."
      }
    }
  };

  return {
    instructionVitals: rules[vector][tier].instruction,
    prohibitions: rules[vector][tier].prohibitions
  };
};
