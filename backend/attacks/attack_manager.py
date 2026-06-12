from attacks.danAttack import run_dan_attackJailbreak
from attacks.DAN6 import run_dan_attack6
from attacks.DAN9 import run_dan_attack9
from attacks.DAN11 import run_dan_attack11
from attacks.stanAttack import run_stan_attack
from attacks.mongoTom import run_mongoTom_attack
from attacks.rolePlaying import run_role_playing_attack
from attacks.chainOfQuestions import run_chain_of_questions_attack
from attacks.asciiArtJailbreak import run_ascii_art_jailbreak_attack
from attacks.base64_encoded import run_base64_attack
from attacks.base64_with_competing import run_base64_competing_attack
from attacks.ubbi_dubbi import run_ubbi_dubbi_attack
from attacks.rot13_encoded import run_rot13_attack
from attacks.leetspeak_attack import run_leetspeak_attack
from attacks.aigy_paigy_attack import run_aigy_paigy_attack
from attacks.poem_attack import run_poem_attack


ATTACKS = {
    "DANJailbreak": run_dan_attackJailbreak,
    "DAN6": run_dan_attack6,
    "DAN9": run_dan_attack9,
    "DAN11": run_dan_attack11,
    "stan": run_stan_attack,
    "mongoTom": run_mongoTom_attack,
    "role-playing-social-engeneering": run_role_playing_attack,
    "chain-of-questions": run_chain_of_questions_attack,
    "ascii-art-jailbreak": run_ascii_art_jailbreak_attack,
    "base64-attack": run_base64_attack,
    "base64-competing-attack": run_base64_competing_attack,
    "ubbi-dubbi-attack": run_ubbi_dubbi_attack,
    "rot13-attack": run_rot13_attack,
    "leetspeak-attack": run_leetspeak_attack,
    "aigy-paigy-attack": run_aigy_paigy_attack,
    "poem_attack": run_poem_attack,
}


async def run_attack(
    attack: str | None,
    model_id: str,
    template: str,
    defense: str = "none",
    session_id: str | None = None,
):
    if not attack or attack == "none":
        attack = "none"

    if attack == "none":
        from attacks.no_attack import run_no_attack
        async for chunk in run_no_attack(model_id, template, defense, session_id):
            yield chunk
        return

    attack_func = ATTACKS.get(attack)

    if attack_func is None:
        raise ValueError(f"Unknown attack: {attack}")

    async for chunk in attack_func(
        model_id=model_id,
        template=template,
        defense=defense,
        session_id=session_id,
    ):
        yield chunk